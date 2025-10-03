# To activate venv

## Windows

Temporary turn off security of running ps1 scripts
```
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
Then activate venv:

```
.\tfenv\Scripts\Activate.ps1
```

You can check if everything is okay with the power shell command:

```
Get-Command python
```