export interface Peer {
  userId: string;
  username: string;
  socket: WebSocket;
}

export interface Room {
  id: string;
  name: string;
  peers: Map<string, Peer>;
  createdAt: number;
}

export interface JoinMessage {
  type: "join";
  roomId: string;
  userId: string;
  username: string;
}

export interface OfferMessage {
  type: "offer";
  roomId: string;
  to: string;
  sdp: unknown;
}

export interface AnswerMessage {
  type: "answer";
  roomId: string;
  to: string;
  sdp: unknown;
}

export interface IceCandidateMessage {
  type: "ice-candidate";
  roomId: string;
  to: string;
  candidate: unknown;
}

export interface LeaveMessage {
  type: "leave";
  roomId: string;
}

export type SignalMessage =
  | JoinMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | LeaveMessage;
