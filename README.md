# FaceRecognitionService

```shell
python -m venv venv
```

Активувавти venv
```shell
poetry shell
```

Встановити всі залежності
```shell
poetry install
```

Встановлення dev залежностей:
```shell
poetry add some-dependency
```

Встановлення dev залежностей:
```shell
poetry add some-dependency --group dev
```

Pyserver:
```shell
DATABASE_URL='postgresql://admin:1U8f)-W33T-I@localhost:5432/frodo' poetry run uvicorn main:app --reload
```

### Docker registry

List of images:
```shell
curl http://localhost:5000/v2/_catalog
```

Add user for docker registry:
```shell
sudo htpasswd -B /etc/nginx/docker-registry.htpasswd another_user
```

```mermaid
graph TD
    subgraph Client ["Клієнтська частина (Browser)"]
        UI["HTML/JS Інтерфейс"]
        Cam["Веб-камера"]
        UI -- "Захоплення кадру" --> Cam
        Cam -- "Відеопотік" --> UI
    end

    subgraph Server ["Монолітний сервер (Python)"]
        API["API Controller"]
        CV["OpenCV: Pre-processing"]
        DF["DeepFace: Vectorization"]
        Live["Liveness Detection"]
        
        API --> CV
        CV --> Live
        Live --> DF
    end

    subgraph Database ["База даних (PostgreSQL)"]
        PG[("Users Table")]
        Vec["pgvector Extension"]
        PG --- Vec
    end

    UI -- "HTTP POST (Image Base64)" --> API
    DF -- "SQL Query (Cosine Distance)" --> PG
    PG -- "Result (User Found/Not Found)" --> API
    API -- "JSON Response (Token)" --> UI
```

