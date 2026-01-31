
export interface Personality {
  id: string;
  name: string;
  voiceId: string; 
  description: string;
  category: 'news' | 'story' | 'podcast' | 'humor' | 'relax';
  subCategory: string;
  instruction: string;
  previewScript: string;
}

const SUB_CATEGORIES = {
  news: [
    { 
      id: 'news_general', 
      name: 'Thời Sự', 
      vibe: 'Trang trọng, uy tín, đĩnh đạc',
      script: "Kính chào quý vị và các bạn, mời quý vị theo dõi bản tin thời sự với những nội dung quan trọng vừa được cập nhật."
    },
    { 
      id: 'news_sports', 
      name: 'Thể Thao', 
      vibe: 'Hào hùng, tốc độ cao, nhiệt huyết',
      script: "Vàoooooooo! Hay quá! Một siêu phẩm không thể tin được, và thế là Việt Nam đã chính thức lên ngôi vô địch!"
    },
    { 
      id: 'news_market', 
      name: 'Thị Trường', 
      vibe: 'Sắc sảo, chuyên nghiệp, nhạy bén',
      script: "Thị trường chứng khoán hôm nay bất ngờ lội ngược dòng, chỉ số VN-Index tăng điểm mạnh mẽ nhờ sự bứt phá của nhóm ngành tài chính."
    },
    { 
      id: 'news_eco', 
      name: 'Kinh Tế - Xã Hội', 
      vibe: 'Điềm tĩnh, phân tích, sâu sắc',
      script: "Bức tranh kinh tế quý ba cho thấy những tín hiệu khởi sắc rõ rệt, đặc biệt là trong lĩnh vực xuất khẩu và đầu tư công."
    },
    { 
      id: 'news_defense', 
      name: 'An Ninh Quốc Phòng', 
      vibe: 'Dứt khoát, mạnh mẽ, nghiêm túc',
      script: "Lực lượng vũ trang luôn sẵn sàng chiến đấu, quyết tâm bảo vệ vững chắc chủ quyền thiêng liêng của Tổ quốc trong mọi tình huống."
    }
  ],
  story: [
    { 
      id: 'story_mystery', 
      name: 'Trinh Thám', 
      vibe: 'Huyền bí, hồi hộp, giọng trầm u uất',
      script: "Trong bóng tối mịt mù của con hẻm nhỏ, một tiếng bước chân lạ lùng bỗng vang lên phía sau lưng hắn... rồi im bặt."
    },
    { 
      id: 'story_romance', 
      name: 'Ngôn Tình', 
      vibe: 'Ngọt ngào, dịu dàng, sâu lắng',
      script: "Dưới cơn mưa chiều hôm ấy, em đã thấy trái tim mình lỗi nhịp khi bắt gặp nụ cười ấm áp của anh. Liệu đó có phải là định mệnh?"
    },
    { 
      id: 'story_family', 
      name: 'Gia Đình', 
      vibe: 'Ấm áp, gần gũi, chân thành',
      script: "Con ơi, dù con có đi đâu xa, mâm cơm nhà với hơi ấm của mẹ vẫn luôn là nơi bình yên nhất để con trở về."
    },
    { 
      id: 'story_detective', 
      name: 'Kinh Dị/Ma Mị', 
      vibe: 'Rùng rợn, nhấn nhá kịch tính, thở dài',
      script: "Chào mừng bạn đến với thế giới tâm linh đầy bí ẩn... Đừng quay đầu lại, vì chúng đang ở ngay phía sau bạn đấy."
    }
  ],
  podcast: [
    { 
      id: 'podcast_healing', 
      name: 'Chữa Lành', 
      vibe: 'Tĩnh lặng, thấu hiểu, thì thầm',
      script: "Hãy hít một hơi thật sâu, buông bỏ mọi phiền muộn, và cho phép bản thân được nghỉ ngơi một chút trong không gian tĩnh lặng này nhé."
    },
    { 
      id: 'podcast_memoir', 
      name: 'Tự Sự', 
      vibe: 'Hoài niệm, trầm lắng, tâm tình',
      script: "Có những ký ức, dù thời gian có trôi đi bao lâu, vẫn cứ vẹn nguyên như một cuốn phim quay chậm trong tâm trí chúng ta."
    },
    { 
      id: 'podcast_comfort', 
      name: 'An Ủi', 
      vibe: 'Vỗ về, ấm áp, nhẹ nhàng',
      script: "Nếu hôm nay bạn cảm thấy mệt mỏi, hãy cứ khóc nếu muốn. Ngày mai, mặt trời vẫn sẽ mọc và mọi chuyện rồi sẽ ổn thôi."
    },
    { 
      id: 'podcast_motivation', 
      name: 'Động Viên', 
      vibe: 'Năng lượng, mạnh mẽ, truyền cảm hứng',
      script: "Đừng bao giờ từ bỏ ước mơ! Thành công chỉ đến với những ai dám đối đầu với thử thách và không ngừng nỗ lực tiến bước về phía trước."
    }
  ],
  humor: [
    { 
      id: 'humor_comedy', 
      name: 'Hài Kịch', 
      vibe: 'Trào phúng, biến hóa giọng điệu, vui vẻ',
      script: "Ối trời đất ơi, bà con lối xóm ơi! Có ai khổ như cái thân tui không nè trời? Cười muốn sái quai hàm luôn hà!"
    },
    { 
      id: 'humor_ad', 
      name: 'Quảng Cáo', 
      vibe: 'Lôi cuốn, bắt tai, hào nhoáng',
      script: "Mua một tặng mười! Cơ hội vàng có một không hai trong năm! Nhanh chân lên kẻo lỡ bạn nhé, số lượng cực kỳ có hạn!"
    }
  ],
  relax: [
    { 
      id: 'relax_meditation', 
      name: 'Thiền Định', 
      vibe: 'Bình an, chậm rãi, hơi thở đều',
      script: "Lắng nghe tiếng chuông ngân, cảm nhận luồng năng lượng bình an đang lan tỏa và nuôi dưỡng từng tế bào trong cơ thể bạn."
    },
    { 
      id: 'relax_edu', 
      name: 'Giáo Dục', 
      vibe: 'Uyên bác, rõ ràng, tin cậy',
      script: "Chào mừng các bạn đến với bài học ngày hôm nay. Chúng ta sẽ cùng khám phá những kiến thức mới giúp thay đổi tư duy và cuộc sống."
    }
  ]
};

const BASE_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

export function generatePersonalities(): Personality[] {
  const list: Personality[] = [];

  Object.entries(SUB_CATEGORIES).forEach(([category, subs]) => {
    subs.forEach(sub => {
      for (let i = 1; i <= 15; i++) {
        const voiceId = BASE_VOICES[(i - 1) % BASE_VOICES.length];
        const isMale = ['Puck', 'Charon', 'Fenrir'].includes(voiceId);
        const region = i % 3 === 0 ? 'Trung' : i % 2 === 0 ? 'Nam' : 'Bắc';
        
        const id = `${sub.id}_${i}`;
        const name = `${isMale ? 'Nam' : 'Nữ'} ${sub.name} v${i} (${region})`;
        
        list.push({
          id,
          name,
          voiceId,
          category: category as any,
          subCategory: sub.name,
          description: `${sub.vibe}. Giọng ${region}.`,
          previewScript: sub.script,
          instruction: `
            Bạn là một chuyên gia lồng tiếng hàng đầu. 
            Lĩnh vực: ${sub.name}. 
            Phong cách: ${sub.vibe}. 
            Vùng miền: Giọng ${region} chuẩn.
            Yêu cầu cảm xúc: ${sub.vibe}. Hãy đọc với sự ${isMale ? 'nam tính, chững chạc' : 'nữ tính, truyền cảm'}. 
            Đặc biệt lưu ý ngắt nghỉ đúng nhịp điệu của thể loại ${sub.name}.
          `
        });
      }
    });
  });

  return list;
}
