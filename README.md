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
uvicorn main:app --reload
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