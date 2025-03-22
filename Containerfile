FROM scratch as builder
COPY dist/ /extension/dist
COPY package.json /extension/
COPY LICENSE /extension/
COPY icon.png /extension/
COPY README.md /extension/

FROM scratch

LABEL org.opencontainers.image.title="Mirror Magic Mirage" \
        org.opencontainers.image.description="Auto configure Podman machines mirroring" \
        org.opencontainers.image.vendor="jeffmaury" \
        io.podman-desktop.api.version=">= 1.12.0"

COPY --from=builder /extension /extension