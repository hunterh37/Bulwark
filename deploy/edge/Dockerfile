# Bulwark Edge runner. Build offline: docker build -t bulwark-runner:1.1.0 .
FROM node:22-alpine
RUN apk add --no-cache git && adduser -D -u 10001 bulwark
COPY bulwark-runner.mjs /opt/bulwark/bulwark-runner.mjs
USER bulwark
WORKDIR /work
ENTRYPOINT ["node", "/opt/bulwark/bulwark-runner.mjs"]
CMD ["watch", "/repos", "--out", "/results", "--every", "3600"]
