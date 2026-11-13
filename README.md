# Saltline — bản tách file

Build lại thành 1 file HTML:  `python3 build.py`  ->  `dist/saltline-stadium.html`
Có thể mở trực tiếp `dist/saltline-stadium.html` bằng trình duyệt hỗ trợ WebGL.

## Cấu trúc
- `index.template.html`  khung HTML, có 2 chỗ `{{CSS}}` và `{{JS}}`
- `css/ui.css`           toàn bộ CSS (HUD, menu, touch...)
- `data/akGold.json`     model súng AK dạng base64 (4MB, ĐỪNG mở bằng editor)
- `js/*.js`              các mảnh của 1 IIFE, ghép theo thứ tự tên file

| file | nội dung (dòng ~) |
|---|---|
| 00-prelude | helper `defineProperty` của esbuild |
| 10-three-r180 | three.js r180 (vendor, không sửa) — 34.9k dòng |
| 20-core | config sân, event bus, RNG, hàm math |
| 30-render-sky-post | renderer, shader trời, post-process (bloom, grade, grain) |
| 40-materials | vật liệu procedural (asphalt, concrete, rust, wood...) |
| 50-props-colliders | container, palette sơn, collider, props |
| 60-level-structures | cầu thang, catwalk, reefer, level static/dynamic |
| 61-colosseum | **MAP MỚI**: `buildColosseum()` + bảng `COLOSSEUM` (kích thước, số bậc, cổng...) |
| 70-harbor-crane-ship | cần cẩu, tàu, kết cấu thép |
| 80-weather-rain | mưa, vũng nước, sấm |
| 90-fx-gameplay | FX, đạn, decal, enemy/objective/input |
| A0-weapon-hud | viewmodel súng + HUD |
| B0-ai-director-audio | AI địch, spawn/wave, radio, audio |
| C0-boot | khởi động, xử lý lỗi, vào game |

## Lưu ý
- Tên biến bị minify (`W`, `Pi`, `Ae`...) và các file chung 1 scope nên KHÔNG import/export được.
  Sửa thoải mái trong từng file, miễn đừng đổi tên biến dùng chéo giữa các file.
- Tên file module là tao đặt theo nội dung, có thể lệch chút ở ranh giới.

## Map Colosseum

- Sàn elip 85 × 50 m. Trục X là chiều dài và trục Z là chiều rộng. Chỉnh kích thước và bậc thềm trong `COLOSSEUM` ở `js/61-colosseum.js`.
- Người chơi xuất phát trong hầm nam. Khi đã vào sân, tường chắn di chuyển ở miệng hầm giữ người chơi trong lòng sân. Chơi lại mở đường vào sân từ đầu.
- Khán đài gồm 28 đoạn và 20 tầng, với 430 khối bậc đá dùng chung một `InstancedMesh`. Các khoảng trống tạo hình phần khán đài sập. Va chạm di chuyển dùng tường bao. Tia đạn kiểm tra bề mặt đá được vẽ trong cảnh.
- `data/colosseum-ruins.json` chứa một mảng vòm và tường đổ trích từ GLB, dùng tại hai vùng sập. Ba texture được thu xuống tối đa 1024 px và nén WebP. Build nhúng dữ liệu này vào HTML.
- Hai cửa hông có điểm spawn mặt đất. Sau khi người chơi vào sân, một Ankylosaurus xuất hiện gần cửa hông đầu tiên và dùng AI Hound. Hạ con lớn, trụ súng nổ rồi hai con nhỏ xuất hiện. Hạ cả hai để thắng.
- Kiểm tra chụp màn hình bằng `python3 shot.py /duong/dan/tuyet/doi/dist/saltline-stadium.html out.png "autostart=1&noaudio=1&q=low"` nếu đã cài Playwright và Chromium.

- Vùng khán đài sập: các bậc bị sập không còn biến mất hẳn mà tụt xuống 1-3 bậc (khoảng 20% biến mất hoàn toàn), dưới mỗi bậc có một lõi đá tối (`cores`, cùng `InstancedMesh`) nên không còn chỗ rỗng nhìn xuyên, và chân tường vòm kéo xuống 4 bậc để khớp với bậc thềm.

- Súng AK-Gold: băng đạn được đổi vật liệu cho khớp thân súng (độ bóng/kim loại và màu), xem khối `{ const m = magazine.material; ... }` trong `dm()` ở `js/A0-weapon-hud.js`. Trong code không có sẵn tay cầm trước nào nên chưa thêm.

## Tay cầm trước AK-Gold

Model tay cầm vàng được giảm còn 9.199 tam giác. Texture WebP và hình học nằm trong `data/akGold-foregrip.json`. Bản HTML đã nhúng toàn bộ dữ liệu. Tay trái giữ tay cầm khi bắn và quay về tay cầm sau khi thay băng.


## Ankylosaurus

- `js/AF-ankylosaurus.js` dựng model từ hai GLB đã đóng gói vào `data/ankylosaurus.json`. Model dùng skeleton và hai clip Idle, Walk có sẵn. Đầu súng gắn theo điểm trên xương sống và xoay theo góc ngắm.
- `js/B0-ai-director-audio.js` điều khiển AI, hitbox và bắn từ đầu nòng mới. Khi chết, model dùng chuyển động đổ từ AI Hound.
- Texture đã thu xuống tối đa 1536 px cho thân và 1024 px cho súng, rồi chuyển sang WebP. Hình học gốc gồm 74.997 tam giác thân và 49.948 tam giác súng. Trận đấu có một con lớn ở pha đầu và hai con nhỏ ở pha sau.
- Mở `dist/saltline-stadium.html` hoặc chạy `python build.py` để tạo lại bản HTML nhúng asset.

Ankylosaurus dùng tỉ lệ 6 lần so với bản tích hợp đầu tiên. Điểm xuất hiện dịch từ cửa hông vào trong sân và hitbox đạn tăng theo model. Lưới di chuyển dùng kích thước tìm đường cũ của Hound.

Boss có 1.400 HP. Mỗi con nhỏ có 140 HP, kích thước bằng 1/6 boss và sát thương bằng 1/5 boss. Vụ nổ khi boss chết chỉ phát hiệu ứng hình ảnh. Hai con nhỏ xuất hiện sau 0,55 giây ở các điểm có đường tới người chơi.
