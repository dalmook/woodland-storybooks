# The Woodland Library · 숲속의 서재

An original Korean and English illustrated storybook library with physical page turns, distinct character voices, locally synthesized narrators, timed reading highlights, and optional automatic page advance.

This is the independent `dalmook/woodland-storybooks` repository. The earlier personal-homepage repository is preserved separately.

## Run locally

Use an existing Node.js installation and run `node server.mjs`, then open `http://localhost:4188/`. No packages or cloud API keys are required for playback. The server binds to loopback only. `src/books.json` contains the books, language variants, per-book casting, MP3 paths and measured reading cues.

## Read

Choose a volume in the illustrated library. Use the page arrows, chapter menu, drag/swipe, or left/right keys. Space plays or pauses; Escape returns to the library. Korean/English and female/male narrator controls reset the previous audio. Character voices remain fixed. Auto-next is optional and waits until the actual narration ends; the last chapter stops. Reduced motion follows the system setting and can be toggled in the header.

See [sources and licenses](SOURCES.md). Raw voice references, private transcripts, cloning prompts, models, caches and credentials are excluded from this repository. Browser/media verification does not constitute a claim of direct subjective listening.


## 모바일 독서 화면 · 2026-10-22

그림과 본문, 재생 조작을 한 화면에 배치했습니다. 본문 안에서 스크롤하며 읽을 수 있고, 그림 크게 보기로 전체 삽화를 감상할 수 있습니다. 작은 가로 화면은 좌우 배치를 사용합니다.

- 낭독 속도 0.75 / 1 / 1.25 / 1.5 / 1.75 / 2배, 음높이 보존 요청
- 10초 앞뒤 이동, 재생·일시정지, 처음부터 읽기, 목차, 실제 재생 종료 후 자동 다음 장
- 16–24px 글자 크기, 따뜻한 종이/밤 모드, 문장 따라가기와 모션 줄이기
- 장 끝/15분/30분 취침 타이머, 현재 기기의 장·낭독 위치 저장과 서재의 이어 읽기
- 그림에서 좌우 스와이프, 화살표 키, Space, Esc, 본문에 포커스 후 PageDown

첫 재생은 사용자가 눌러야 합니다. 설정 창은 Esc로 닫습니다. 속도를 변경해도 하이라이트는 원래 음원의 재생 위치에 맞춥니다. 언어·해설·장을 변경하면 이전 음원을 정지합니다. 취침 타이머는 새로고침/서재로 돌아갈 때 해제됩니다. 탭이 숨겨지면 낭독은 일시정지합니다. 기기 저장소가 제한되면 현재 세션의 읽기는 계속 가능하지만 이어 읽기 저장은 유지되지 않을 수 있습니다.

참고: [Apple Books 플레이어](https://support.apple.com/en-gb/guide/iphone/iphac1971248/ios), [Google 읽기 모드](https://support.google.com/accessibility/android/answer/13026948?hl=en), [W3C 터치 대상 크기](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). 기존 그림·대본·음원은 변경하지 않았습니다.


## 부드러운 페이지 이동 · 2026-10-22

목차 이동 때 책을 재사용하고, 언어·화면 전환으로 폐기한 책의 렌더링 및 이벤트를 정리했습니다. 읽는 동안에는 책 엔진이 다시 그리지 않고, 페이지가 움직일 때만 갱신합니다. 가속·감속을 적용하고 움직이는 책 전체에 걸리던 그림자 필터를 고정 그림자로 바꿨습니다. 세로 화면의 이전 장 버튼 좌표도 바로잡았습니다.
