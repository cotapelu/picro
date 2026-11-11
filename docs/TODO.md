# TODO.md – Évolution Backlog

## Đang thực hiện / Sắp tới

- [ ] Viết lại toàn bộ `src/tui/ink/interactive-app.tsx`: điểm vào Ink, kiểm tra stdin là raw-mode TTY, fallback readline REPL khi không phải TTY
- [ ] Viết lại toàn bộ `src/tui/ink/App.tsx`: layout chuẩn pi-mono (header cố định đầu, messages co giãn chiếm không gian còn lại, input dock cố định đáy, statusbar ngay dưới input)
- [ ] Viết lại toàn bộ `src/tui/ink/components/Input.tsx`: prompt `> `, con trỏ blinking `█`, chỉ component này đăng ký `useInput`, xử lý Enter/Backspace/ký tự in được
- [ ] Viết lại toàn bộ `src/tui/ink/components/VirtualMessageList.tsx`: follow-end scroll như `ScrollView follow: "end"`, không đăng ký `useInput`, không xung đột với Input
- [ ] Viết lại toàn bộ `src/tui/ink/components/StatusBar.tsx`: 2 dòng như `FooterComponent` (dòng trên pwd dim, dòng dưới model + tokens + context + trạng thái xử lý)
- [ ] Viết lại toàn bộ `src/tui/ink/components/Header.tsx`: tiêu đề ứng dụng + phím tắt chính như `BuiltInHeader`
- [ ] Viết lại toàn bộ `src/tui/ink/components/Modal.tsx`: overlay modal, định vị trung tâm, border tròn, padding
- [ ] Viết lại toàn bộ `src/tui/ink/components/Toast.tsx`: thông báo tạm thời, auto-remove sau duration, màu theo loại (info/success/error/warning)
- [ ] Viết lại toàn bộ `src/tui/ink/components/Keybindings.tsx`: hiển thị danh sách phím tắt có sẵn
- [ ] Viết lại toàn bộ `src/tui/ink/components/ThemeSelector.tsx`: chọn chủ đề dark/light/matrix, điều hướng ↑/↓, Enter xác nhận, Ctrl+C hủy
- [ ] Viết lại toàn bộ `src/tui/ink/components/SettingsSelector.tsx`: danh sách cài đặt (theme, công cụ bị tắt, nhà cung cấp mặc định, mô hình mặc định, cấp độ suy nghĩ), điều hướng, xác nhận
- [ ] Viết lại toàn bộ `src/tui/ink/components/ModelSelector.tsx`: tìm kiếm mô hình, danh sách theo nhà cung cấp, điều hướng, xác nhận
- [ ] Viết lại toàn bộ `src/tui/ink/components/SessionSelector.tsx`: chọn phiên làm việc, tìm kiếm, sắp xếp, xóa phiên
- [ ] Viết lại toàn bộ `src/tui/ink/components/MarkdownRenderer.tsx`: render markdown tin nhắn, hỗ trợ mã, liên kết, danh sách, bảng
- [ ] Viết lại toàn bộ `src/tui/ink/components/MessageList.tsx`: danh sách tin nhắn chat, phân biệt user/assistant, canh lề, padding
- [ ] Viết lại toàn bộ `src/tui/ink/components/FormatTokens.ts`: định dạng số token (k, M)
- [ ] Viết lại toàn bộ `src/tui/ink/theme.ts`: hệ thống màu (màu cơ bản, màu sáng, in đậm, mờ, nghiêng, gạch dưới, ngược, màu nền, composite helpers)
- [ ] Viết lại toàn bộ `src/tui/ink/test-setup.ts`: cấu hình kiểm thử môi trường Ink (mock TTY)
- [ ] Viết lại toàn bộ `src/tui/ink/index.ts`: xuất tất cả thành phần

## Hoàn thành

- [x] Loại bỏ chế độ in/rpc, chỉ giữ chế độ TTY
- [x] Thay thế TUI tùy chỉnh bằng terminal thuần (không dùng giao diện readline)
- [x] Thêm lệnh slash `/model` kèm menu tương tác
- [x] Đảm bảo chỉ cho phép TTY (chặn chế độ pipe)
- [x] Tách chế độ TTY thành các module và thành phần (InputHandler, MenuSystem, CommandProcessor, PromptLine, OutputRenderer, ConfigManager, StatusBar)
- [x] Tạo `docs/PROJECT_STATE.md` (phiên bản đầu tiên)
- [x] Build thành công (`npm run build`)
- [x] Thêm kiểm thử đơn vị cho chế độ TTY (41 kiểm thử pass)
- [x] Sửa trình phân tích đối số CLI: xóa tùy chọn `--mode` cũ, thêm cảnh báo khi cấp độ suy nghĩ không hợp lệ
- [x] Tất cả kiểm thử pass (2308+)
- [x] Thêm lệnh `/login` (đặt khóa API)
- [x] OutputRenderer: màu sắc, markdown, thanh quay, tiến độ, khối mã
- [x] InputHandler: nhiều dòng, lịch sử, phím tắt sửa chữa, lịch sử bền vững
- [x] ConfigManager: cấu hình bền vững, đặt lại/khôi phục
- [x] Thêm lệnh `/sessions` (liệt kê, chuyển phiên)
- [x] Thêm lệnh `/settings` (xem/sửa cấu hình)
- [x] Thêm lệnh `/tools` (bật/tắt công cụ内建)
- [x] Thêm lệnh `/theme` (chuyển màu chủ đề)
- [x] Port TUI Ink từ pi-mono: viết lại tất cả thành phần (Footer, MessageList, Input, Modal, StatusBar, Toast, SessionSelector, SettingsSelector, ModelSelector, ThemeSelector)
- [x] Viết lại InteractiveController: TypeScript thuần, xử lý lệnh slash, sự kiện runtime
- [x] Viết lại InteractiveMode: TypeScript thuần điều phối, kết nối runtime + giao diện Ink
- [x] Viết interactive-app.tsx: điểm vào Ink
- [x] Cập nhật main.ts: dùng TUI Ink làm chế độ mặc định
- [x] Thêm cuộn ảo cho danh sách tin nhắn
- [x] Thêm hiển thị markdown cho tin nhắn trợ lý
- [x] Thêm phím tắt (Ctrl+K, Ctrl+P, Ctrl+L, Ctrl+C)
- [x] Thêm hệ thống chủ đề (tối, sáng, matrix)
- [x] Thêm chế độ API HTTP với REST và WebSocket
- [x] Build và kiểm thử
- [x] Thêm script `npm run start` (chạy `node dist/cli.js`)
- [x] Cập nhật `npm run dev` tự động build rồi chạy `npm start` với `VERBOSE=1`
- [x] Thêm chế độ dự phòng readline REPL khi stdin không phải raw-mode TTY
- [x] Sửa lỗi giá trị `NaN` chiều cao khung nhìn khi `rows` chưa khởi tạo
- [x] Khóa ô nhập liệu ở đáy màn hình (`flexShrink={0}`) không bị cuộn lên

## Hoãn lại / Tương lai

- [ ] Thêm tùy chọn tham gia telemetry
- [ ] Triển khai xuất/nhập phiên làm việc

---

*Thứ tự ưu tiên tuân theo tác động lớn nhất, rủi ro thấp nhất trước tiên.*
