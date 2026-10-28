export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          is_banned: boolean;
          role: 'admin' | 'student';
          donor_level: number;
          donor_tier: string | null;
          donor_since: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          is_banned?: boolean;
          role?: 'admin' | 'student';
          donor_level?: number;
          donor_tier?: string | null;
          donor_since?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          is_banned?: boolean;
          role?: 'admin' | 'student';
          donor_level?: number;
          donor_tier?: string | null;
          donor_since?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      quiz_sets: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          is_active: boolean;
          min_donor_level: number;
          storage_file_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          is_active?: boolean;
          min_donor_level?: number;
          storage_file_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          is_active?: boolean;
          min_donor_level?: number;
          storage_file_path?: string | null;
          created_at?: string;
        };
      };
      lessons: {
        Row: {
          id: string;
          set_id: string;
          lesson_num: number;
          title: string;
          source_doc: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          set_id: string;
          lesson_num: number;
          title: string;
          source_doc?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          set_id?: string;
          lesson_num?: number;
          title?: string;
          source_doc?: string | null;
          created_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          set_id: string;
          lesson_id: string | null;
          lesson_num: number;
          question_order: number;
          question_text: string;
          options: Json;
          correct_option: string;
          answer_text: string | null;
          explanation: string | null;
          source_ref: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          set_id: string;
          lesson_id?: string | null;
          lesson_num: number;
          question_order: number;
          question_text: string;
          options: Json;
          correct_option: string;
          answer_text?: string | null;
          explanation?: string | null;
          source_ref?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          set_id?: string;
          lesson_id?: string | null;
          lesson_num?: number;
          question_order?: number;
          question_text?: string;
          options?: Json;
          correct_option?: string;
          answer_text?: string | null;
          explanation?: string | null;
          source_ref?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          set_id: string | null;
          total_questions: number;
          correct_count: number;
          score: number;
          duration_ms: number;
          wrong_question_ids: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          set_id?: string | null;
          total_questions: number;
          correct_count: number;
          score: number;
          duration_ms: number;
          wrong_question_ids?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          set_id?: string | null;
          total_questions?: number;
          correct_count?: number;
          score?: number;
          duration_ms?: number;
          wrong_question_ids?: string[] | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_active_user: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
  };
}
