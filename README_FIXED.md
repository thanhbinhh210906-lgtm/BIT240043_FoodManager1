# BIT240043_FoodManager — bản đã chỉnh sửa

## Công nghệ
- React Native + Expo
- React Navigation Native Stack
- AsyncStorage để lưu cache và thay đổi khi offline
- MockAPI để đọc/ghi món ăn và danh mục
- NetInfo để phát hiện trạng thái kết nối và kích hoạt đồng bộ tự động

## Chạy project
1. Giải nén thư mục project.
2. Mở terminal tại thư mục `BIT240043_FoodManager`.
3. Chạy `npm install` nếu máy chưa có dependencies.
4. Chạy `npx expo start`.
5. Nhấn `a` để chạy Android emulator hoặc quét QR bằng Expo Go nếu phiên bản Expo Go tương thích SDK của project.

## Dữ liệu MockAPI
- Danh mục: `https://6ad71c60f71f154ac487cab2.mockapi.io/BIT240043_DishCategory`
- Món ăn: `https://6ad71c60f71f154ac487cab2.mockapi.io/BIT240043_Dish`
- Các trường dữ liệu ứng dụng gửi lên API dùng tiền tố `BIT240043_`. MockAPI dùng trường hệ thống `id` làm ID bản ghi.
- Ảnh được lưu trong trường `BIT240043_DishImage` dưới dạng danh sách object gồm `BIT240043_ImageUrl` và `BIT240043_IsThumbnail`.

## Lưu ý kiểm tra trước khi quay video
- Đảm bảo hai endpoint MockAPI đã có tối thiểu 3 danh mục và 5 món ăn.
- Kiểm tra dữ liệu danh mục thực tế trên MockAPI có `id` và `BIT240043_Name` (hoặc cập nhật mapping nếu tên trường khác).
- Thử tạo/sửa/xóa khi online; sau đó bật chế độ máy bay, tạo/sửa món, tắt chế độ máy bay và chờ đồng bộ.
- Offline sync phụ thuộc vào kết nối thực tế và khả năng truy cập MockAPI; nên kiểm thử trên thiết bị/emulator trước khi quay video.
