const RTC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export class RTCManager {
  constructor(localStream, signaling, onRemoteStream, onRemoteLeft) {
    this._local = localStream;
    this._sig = signaling;
    this._onRemoteStream = onRemoteStream;
    this._onRemoteLeft = onRemoteLeft;
    this._peers = new Map(); // userId -> RTCPeerConnection
  }

  // Called when we join a room that already has peers
  async connectToPeer(roomId, myId, peerId) {
    const pc = this._createPc(peerId, roomId, myId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this._sig.send({ type: "offer", roomId, to: peerId, sdp: pc.localDescription });
  }

  async handleOffer(roomId, fromId, sdp, myId) {
    const pc = this._createPc(fromId, roomId, myId);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this._sig.send({ type: "answer", roomId, to: fromId, sdp: pc.localDescription });
  }

  async handleAnswer(fromId, sdp) {
    const pc = this._peers.get(fromId);
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  async handleIceCandidate(fromId, candidate) {
    const pc = this._peers.get(fromId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    }
  }

  removePeer(userId) {
    const pc = this._peers.get(userId);
    if (pc) { pc.close(); this._peers.delete(userId); }
    this._onRemoteLeft(userId);
  }

  closeAll() {
    for (const pc of this._peers.values()) pc.close();
    this._peers.clear();
  }

  replaceVideoTrack(newTrack) {
    for (const pc of this._peers.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(newTrack);
    }
  }

  _createPc(peerId, roomId, myId) {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    this._peers.set(peerId, pc);

    // Add local tracks
    for (const track of this._local.getTracks()) {
      pc.addTrack(track, this._local);
    }

    // Forward ICE candidates
    pc.addEventListener("icecandidate", (e) => {
      if (e.candidate) {
        this._sig.send({ type: "ice-candidate", roomId, to: peerId, candidate: e.candidate.toJSON() });
      }
    });

    // Receive remote stream
    const remoteStream = new MediaStream();
    pc.addEventListener("track", (e) => {
      remoteStream.addTrack(e.track);
      this._onRemoteStream(peerId, remoteStream);
    });

    return pc;
  }
}
