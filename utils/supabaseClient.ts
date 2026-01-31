import { createClient } from '@supabase/supabase-js';

// Khởi tạo Supabase Client
// Lưu ý: Trong môi trường thực tế, các biến này nên được lấy từ process.env
// Để ứng dụng hoạt động ngay, bạn cần điền URL và KEY của dự án Supabase của bạn vào đây
// hoặc đảm bảo process.env trả về giá trị đúng.

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export interface Appointment {
  id?: string;
  full_name: string;
  appointment_date: string;
  appointment_time: string;
  notes?: string;
  created_at?: string;
}