# cmmt

출퇴근 시간을 기록하고 관리하기 위한 스크립트 모음.

## Apps Script

[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)

출근과 퇴근 시각을 지정된 구글 시트에 기록합니다. iOS Shortcuts 앱에서 `clasp` 으로 배포된 Apps Script 에 `HTTP GET` 요청을 보내 실행합니다.

### setup

[clasp](https://github.com/google/clasp/blob/master/docs/run.md#setup-instructions) 을 설치합니다. `clasp` 으로 실행, 배포하기 위해 스크립트 프로젝트를 [gcp](https://cloud.google.com/) 와 [연동합니다.](https://github.com/google/clasp/blob/master/docs/run.md#setup-instructions)

```
$ clasp login --creds cred.json
$ clasp create --rootDir scripts --parentId <DRIVE_ID>
```

### development

```
$ clasp push
$ clasp run 'main' -p '["CLOCK_IN", "김경열", {"pad": "0211"}]'
$ clasp logs --watch
```

### deploy

```
$ clasp deployments
$ clasp deploy --deploymentId <DEPLOYMENT_ID>
```

### iOS Shortcut

* [NFC 태그를 준비합니다.](https://www.amazon.com/s?k=nfc)
* NFC 태그로 실행할 [Clock In & Out](https://www.icloud.com/shortcuts/05e9e63ffb6145ca9ae28a459e817a62) iOS Shortcut 을 기기에 설치합니다.
* Shortcuts 앱에서 `NFC` Automation 을 생성합니다.
<img width="250" src="https://user-images.githubusercontent.com/286950/74608614-0902b180-5126-11ea-884b-c91817eaddf9.png"/>

* NFC 태그가 스캔되었을때 실행할 Shortcut 을 설정합니다.
<img width="250" src="https://user-images.githubusercontent.com/286950/74608650-626ae080-5126-11ea-9081-57d7d35b72ff.png"/>

## [Timing](https://timingapp.com/)

출근, 퇴근에 걸린 시간을 [Timing](https://web.timingapp.com/) 에 기록합니다. iOS Shortcuts 앱에서 [Timing Web API](https://web.timingapp.com/docs/) 를 호출해서 실행합니다.

* [NFC 태그를 준비합니다.](https://www.amazon.com/s?k=nfc)
* NFC 태그로 실행할 [Log Timing Task](https://www.icloud.com/shortcuts/8e930ced7fa045a4bc73f587f884ed84) iOS Shortcut 을 기기에 설치합니다.
* Shortcuts 앱에서 `NFC` Automation 을 생성합니다.
<img width="250" src="https://user-images.githubusercontent.com/286950/74608614-0902b180-5126-11ea-884b-c91817eaddf9.png"/>

* NFC 태그가 스캔되었을때 실행할 Shortcut 을 설정합니다.
<img width="250" src="https://user-images.githubusercontent.com/286950/74608654-672f9480-5126-11ea-9c16-1070dccc8609.png"/>