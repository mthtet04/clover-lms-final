// ==========================================
// Existing LMS Interfaces
// ==========================================

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'instructor' | 'unistudent' | 'outsider';
}

export interface CourseVideo {
  id: number;
  course_id: number;
  title: string;
  url: string;
}

export interface Assignment {
  id: number;
  course_id: number;
  title: string;
  description?: string;
  desc?: string; // Optional alias matching legacy frontend usage
}

export interface Course {
  id: number;
  title: string;
  price: number;
  instructor_email?: string;
  instructorEmail?: string;
  instructor?: string;
  videos?: CourseVideo[];
  assignments?: Assignment[];
}

export interface Enrollment {
  enrollment_id?: string;
  courseId: number;
  course_id?: number;
  studentEmail: string;
  student_email?: string;
  enroll_date?: string;
  enrollment_status?: 'Active' | 'Finished';
}

export interface Submission {
  id: number;
  assignmentId?: number;
  assignment_id?: number;
  courseId?: number;
  course_id?: number;
  studentEmail?: string;
  student_email?: string;
  studentName?: string;
  student_name?: string;
  content: string;
  status: 'Pending' | 'Graded';
  marks: number | null;
  feedback: string | null;
}

// ==========================================
// Restaurant / Other Interfaces
// ==========================================

export interface MenuItem {
    menu_item_id: number;
    category_id: number | null;
    item_name: string;
    description: string;
    price: string; // Decimal from MySQL returns as string in JS
    image_url: string | null;
    is_available: boolean;
}

export interface RestaurantTable {
    table_id: number;
    table_number: number;
    capacity: number;
    status: 'available' | 'occupied' | 'reserved';
}