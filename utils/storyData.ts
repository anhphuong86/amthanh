
export interface Story {
  id: string;
  title: string;
  genre: string;
  content: string;
}

export const STORY_LIBRARY: Story[] = [
  {
    id: 'tamcam',
    title: 'Tấm Cám',
    genre: 'Cổ tích',
    content: `Ngày xưa, có hai chị em cùng cha khác mẹ tên là Tấm và Cám. Mẹ Tấm chết sớm, cha thì nhu nhược. Tấm phải ở với dì ghẻ là mẹ của Cám. Tấm làm lụng vất vả suốt ngày, còn Cám được nuông chiều, chỉ quanh quẩn ở nhà chơi. Một hôm, dì ghẻ đưa cho hai chị em mỗi người một cái giỏ, bảo ra đồng bắt tôm tép... (AI hãy kể tiếp theo phong cách nhân vật)`
  },
  {
    id: 'thach sanh',
    title: 'Thạch Sanh',
    genre: 'Cổ tích',
    content: `Ngày xưa ở quận Cao Bình có hai vợ chồng già tuổi đã cao mà chưa có con. Ngọc Hoàng sai Thái tử xuống đầu thai làm con... Thạch Sanh mồ côi cha mẹ từ bé, sống lủi thủi trong túp lều dưới gốc đa, gia tài chỉ có lưỡi búa cha để lại. Một hôm, có người hàng rượu tên là Lý Thông đi qua đó...`
  },
  {
    id: 'caykhe',
    title: 'Sự tích Cây Khế',
    genre: 'Cổ tích',
    content: `Nhà kia có hai anh em, cha mẹ mất sớm. Người anh tham lam chiếm hết gia tài, chỉ chia cho người em túp lều tranh và cây khế ngọt. Người em chăm chỉ làm ăn, chăm sóc cây khế. Đến mùa khế chín, bỗng có con chim lạ rất lớn bay đến ăn...`
  },
  {
    id: 'maianhthiem',
    title: 'Sự tích Dưa Hấu',
    genre: 'Truyền thuyết',
    content: `Ngày xưa, đời Hùng Vương thứ 17, có chàng Mai An Tiêm là con nuôi của vua. Chàng tháo vát, thông minh. Vì làm phật ý vua, chàng bị đày ra đảo hoang. Tại đây, chàng tìm được giống dưa lạ vỏ xanh ruột đỏ, ăn rất ngọt mát...`
  },
  {
    id: 'deomenghe',
    title: 'Đẽo cày giữa đường',
    genre: 'Ngụ ngôn',
    content: `Một bác nông dân nọ muốn làm cái cày thật tốt để làm ruộng. Bác ngồi đẽo cày ngay vệ đường. Người qua kẻ lại, ai thấy cũng góp ý dăm câu... Cuối cùng cái cày của bác chả ra hình thù gì cả.`
  },
  {
    id: 'conrongchau',
    title: 'Con Rồng Cháu Tiên',
    genre: 'Truyền thuyết',
    content: `Ngày xưa, ở miền đất Lạc Việt, có vị thần thuộc nòi Rồng tên là Lạc Long Quân. Thần sức khỏe vô địch, có nhiều phép lạ. Thần gặp nàng Âu Cơ xinh đẹp tuyệt trần, thuộc dòng dõi Thần Nông...`
  },
  {
    id: 'kynguyenso',
    title: 'Kỷ Nguyên Số (VieNeu Demo)',
    genre: 'Khoa học & Đời sống',
    content: `Trong kỷ nguyên số, việc tiếp cận thông tin đã trở nên dễ dàng hơn bao giờ hết. Chúng ta có thể đọc báo trực tuyến, xem video và tham gia các lớp học từ xa chỉ với một chiếc điện thoại thông minh. Tuy nhiên, khối lượng nội dung khổng lồ này đôi khi khiến người học cảm thấy choáng ngợp. Một chiến lược hiệu quả là chia nhỏ tài liệu thành các đoạn ngắn, mỗi đoạn tập trung vào một ý chính, nhằm giúp não bộ xử lý thông tin tốt hơn. Khi áp dụng kỹ thuật này cho việc luyện nghe tiếng Việt, người học không chỉ cải thiện kỹ năng ngôn ngữ mà còn rèn luyện được khả năng tập trung và ghi nhớ. Ngoài ra, việc nghe lại giọng của chính mình qua các công cụ tổng hợp tiếng nói cũng giúp phát hiện lỗi phát âm và chỉnh sửa kịp thời.`
  }
];
