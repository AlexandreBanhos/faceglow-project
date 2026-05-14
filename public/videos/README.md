# Hero Video Assets

Adicione os seguintes arquivos nesta pasta antes do deploy:

| Arquivo | Formato | Notas |
|---|---|---|
| `hero-face.webm` | VP9 | Versão principal (menor tamanho) |
| `hero-face.mp4` | H.264 | Fallback para Safari/iOS |
| `hero-face-poster.jpg` | JPEG | Frame estático exibido antes do vídeo carregar |

## Especificações recomendadas

- Resolução: 600×750px (4:5) ou 540×675px
- Duração: 6–12s em loop perfeito
- Bitrate webm: ~800kbps | mp4: ~1200kbps
- Poster: 80% qualidade JPEG, mesmo frame do primeiro frame do vídeo

## Geração via ffmpeg

```bash
# WebM (VP9)
ffmpeg -i input.mp4 -c:v libvpx-vp9 -b:v 800k -vf "scale=600:750" -an hero-face.webm

# MP4 (H.264)
ffmpeg -i input.mp4 -c:v libx264 -b:v 1200k -vf "scale=600:750" -an hero-face.mp4

# Poster (primeiro frame)
ffmpeg -i input.mp4 -vframes 1 -q:v 2 hero-face-poster.jpg
```
