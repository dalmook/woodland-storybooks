# Sources and licenses

All Korean and English story prose in this edition is newly written. The underlying folktale plots are traditional; modern translations, broadcast dialogue/audio, film designs and other illustrators' artwork are not reproduced.

- Rapunzel: an original adaptation of the traditional Grimm plot; original watercolor illustrations from the existing complete project are reused with new local narration.
- Kongjwi and Patjwi: task, animal-helper and shoe-recognition folktale motifs; this child-friendly version concludes with recognition, accountability and chosen marriage. The violent later novel sequel is excluded. [KBS motif reference](https://world.kbs.co.kr/service/contents_view.htm?board_seq=417435&id=&lang=k&menu_cate=culture&page=70), [study of the oral tale and novel](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART001726221).
- Heungbu and Nolbu: traditional brothers, grateful swallow and gourd motifs; animal harm and the goblin consequences are non-graphic. [Encyclopedia of Korean Culture](https://encykorea.aks.ac.kr/Article/E0066012).
- The Sun and the Moon: two siblings, tiger recognition tests, tree escape, sound/rotten ropes and exchanged sky roles; loss and peril are presented without graphic imagery. [Encyclopedia of Korean Culture](https://encykorea.aks.ac.kr/Article/E0062663).

Art is generated specifically for this original edition using the built-in image generation tool. Lettering is laid out in HTML, not baked into illustrations. Korean clothes, architecture and recurring faces are controlled for each book.

The project uses locally generated Qwen3-TTS-12Hz-0.6B-Base audio with separate narrators and character roles. References were selected from the project owner's supplied catalogue by language, acting age and role; English references use the US-English catalogue without alternate-accent tags. Raw references, private transcripts, prompts, embeddings and models are not included. Authorization records remain private with the publisher.

## Runtime dependencies

- [StPageFlip 2.0.7](https://github.com/Nodlik/StPageFlip), MIT. Its license is in `vendor/StPageFlip-LICENSE.txt`. The vanilla JavaScript engine supplies touch/portrait pages, physical covers and shadows. The integration is tested directly because the upstream release cadence is old.
- [Noto Serif KR](https://github.com/notofonts/noto-cjk), SIL Open Font License. The license is in `assets/fonts/NotoSerifKR-OFL.txt`.
- [Cormorant Garamond](https://github.com/CatharsisFonts/Cormorant), SIL Open Font License. The license is in `assets/fonts/CormorantGaramond-OFL.txt`.
- [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS), Apache-2.0; the license text is in `vendor/Qwen3-TTS-LICENSE.txt`. Model weights and source reference samples are not distributed with this static site.

The earlier dependency review also considered [react-pageflip](https://github.com/Nodlik/react-pageflip) (MIT, a React wrapper around the same engine) and [turn.js](https://github.com/blasten/turn.js) (jQuery dependency and noncommercial/commercial license distinctions). StPageFlip was selected for the light framework-free implementation and directly tested integration. This does not imply a new upstream release or a maintenance guarantee.


## Page transition maintenance · 2026-10-22

The bundled StPageFlip 2.0.7 (MIT, https://github.com/Nodlik/StPageFlip) includes a small local patch: stop/cancel renderer frames on destroy, always remove input/resize listeners, ignore deferred initialization of destroyed instances, schedule draws on demand, use a monotonic animation start clock and sine easing, and locate the previous-page corner relative to the book bounds in portrait mode. Original license notices are retained. Chapter jumps reuse the current book. Static box shadows replace a filter around the animated book; scene animations pause during a turn. No artwork, narration or story text changed.
