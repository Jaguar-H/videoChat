FROM denoland/deno:2.3.3

WORKDIR /app

COPY . .

RUN deno cache server/server.ts

EXPOSE 8000

CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "server/server.ts"]
