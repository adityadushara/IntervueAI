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
          full_name: string;
          company_name: string;
          role: 'recruiter' | 'admin' | 'hiring_manager';
          is_approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          company_name: string;
          role?: 'recruiter' | 'admin' | 'hiring_manager';
          is_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          company_name?: string;
          role?: 'recruiter' | 'admin' | 'hiring_manager';
          is_approved?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      job_configurations: {
        Row: {
          id: string;
          recruiter_id: string;
          company_name: string;
          job_title: string;
          job_description: string;
          required_skills: string[];
          required_experience: string;
          seniority_level: string;
          interview_type: string;
          difficulty: string;
          question_count: number;
          expected_duration_minutes: number;
          language: string;
          structured_plan?: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recruiter_id: string;
          company_name: string;
          job_title: string;
          job_description: string;
          required_skills?: string[];
          required_experience: string;
          seniority_level: string;
          interview_type: string;
          difficulty: string;
          question_count?: number;
          expected_duration_minutes?: number;
          language?: string;
          structured_plan?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          recruiter_id?: string;
          company_name?: string;
          job_title?: string;
          job_description?: string;
          required_skills?: string[];
          required_experience?: string;
          seniority_level?: string;
          interview_type?: string;
          difficulty?: string;
          question_count?: number;
          expected_duration_minutes?: number;
          language?: string;
          structured_plan?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_configurations_recruiter_id_fkey";
            columns: ["recruiter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      interview_invitations: {
        Row: {
          id: string;
          recruiter_id: string;
          job_config_id: string;
          token_hash: string;
          candidate_name: string;
          candidate_email: string;
          status: 'active' | 'in_progress' | 'completed' | 'expired' | 'revoked';
          expires_at: string;
          evaluation_status?: 'pending' | 'processing' | 'completed' | 'failed';
          evaluation_error?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recruiter_id: string;
          job_config_id: string;
          token_hash: string;
          candidate_name: string;
          candidate_email: string;
          status?: 'active' | 'in_progress' | 'completed' | 'expired' | 'revoked';
          expires_at: string;
          evaluation_status?: 'pending' | 'processing' | 'completed' | 'failed';
          evaluation_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          token_hash?: string;
          status?: 'active' | 'in_progress' | 'completed' | 'expired' | 'revoked';
          expires_at?: string;
          evaluation_status?: 'pending' | 'processing' | 'completed' | 'failed';
          evaluation_error?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_invitations_recruiter_id_fkey";
            columns: ["recruiter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_invitations_job_config_id_fkey";
            columns: ["job_config_id"];
            isOneToOne: false;
            referencedRelation: "job_configurations";
            referencedColumns: ["id"];
          }
        ];
      };
      interview_sessions: {
        Row: {
          id: string;
          invitation_id: string;
          started_at: string;
          completed_at: string | null;
          total_duration_seconds: number;
          client_ip_address: string | null;
          client_user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invitation_id: string;
          started_at?: string;
          completed_at?: string | null;
          total_duration_seconds?: number;
          client_ip_address?: string | null;
          client_user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          total_duration_seconds?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_sessions_invitation_id_fkey";
            columns: ["invitation_id"];
            isOneToOne: false;
            referencedRelation: "interview_invitations";
            referencedColumns: ["id"];
          }
        ];
      };
      interview_questions: {
        Row: {
          id: string;
          job_config_id: string;
          invitation_id: string | null;
          question_number: number;
          text: string;
          category: string;
          context: string | null;
          sample_hints: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          job_config_id: string;
          invitation_id?: string | null;
          question_number: number;
          text: string;
          category: string;
          context?: string | null;
          sample_hints?: string[];
          created_at?: string;
        };
        Update: {
          question_number?: number;
          text?: string;
          category?: string;
          context?: string | null;
          sample_hints?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "interview_questions_job_config_id_fkey";
            columns: ["job_config_id"];
            isOneToOne: false;
            referencedRelation: "job_configurations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_questions_invitation_id_fkey";
            columns: ["invitation_id"];
            isOneToOne: false;
            referencedRelation: "interview_invitations";
            referencedColumns: ["id"];
          }
        ];
      };
      candidate_answers: {
        Row: {
          id: string;
          session_id: string;
          invitation_id: string;
          question_id: string;
          question_text: string;
          answer_text: string;
          time_spent_seconds: number;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          invitation_id: string;
          question_id: string;
          question_text: string;
          answer_text: string;
          time_spent_seconds?: number;
          submitted_at?: string;
        };
        Update: {
          answer_text?: string;
          time_spent_seconds?: number;
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_answers_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "interview_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidate_answers_invitation_id_fkey";
            columns: ["invitation_id"];
            isOneToOne: false;
            referencedRelation: "interview_invitations";
            referencedColumns: ["id"];
          }
        ];
      };
      recruiter_evaluations: {
        Row: {
          id: string;
          invitation_id: string;
          recruiter_id: string;
          technical_competency: ('Exceptional' | 'Strong' | 'Satisfactory' | 'Needs Review') | null;
          communication_clarity: ('Clear & Structured' | 'Good' | 'Verbose' | 'Too Brief') | null;
          recommendation: string | null;
          overall_assessment: string | null;
          notable_strengths: string[];
          areas_to_probe: string[];
          evaluation_generated_at: string;
          detailed_evaluation?: Json | null;
          overall_score?: number | null;
          evaluation_status: 'pending' | 'processing' | 'completed' | 'failed';
          evaluation_error?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invitation_id: string;
          recruiter_id: string;
          technical_competency?: ('Exceptional' | 'Strong' | 'Satisfactory' | 'Needs Review') | null;
          communication_clarity?: ('Clear & Structured' | 'Good' | 'Verbose' | 'Too Brief') | null;
          recommendation?: string | null;
          overall_assessment?: string | null;
          notable_strengths?: string[];
          areas_to_probe?: string[];
          evaluation_generated_at?: string;
          detailed_evaluation?: Json | null;
          overall_score?: number | null;
          evaluation_status?: 'pending' | 'processing' | 'completed' | 'failed';
          evaluation_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          technical_competency?: ('Exceptional' | 'Strong' | 'Satisfactory' | 'Needs Review') | null;
          communication_clarity?: ('Clear & Structured' | 'Good' | 'Verbose' | 'Too Brief') | null;
          recommendation?: string | null;
          overall_assessment?: string | null;
          notable_strengths?: string[];
          areas_to_probe?: string[];
          detailed_evaluation?: Json | null;
          overall_score?: number | null;
          evaluation_status?: 'pending' | 'processing' | 'completed' | 'failed';
          evaluation_error?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recruiter_evaluations_invitation_id_fkey";
            columns: ["invitation_id"];
            isOneToOne: true;
            referencedRelation: "interview_invitations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recruiter_evaluations_recruiter_id_fkey";
            columns: ["recruiter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      rate_limit_buckets: {
        Row: {
          key: string;
          count: number;
          reset_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          count?: number;
          reset_at: string;
          updated_at?: string;
        };
        Update: {
          count?: number;
          reset_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_rate_limit: {
        Args: {
          p_key: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: Json;
      };
      get_candidate_interview_by_hash: {
        Args: {
          p_token_hash: string;
        };
        Returns: Json;
      };
      start_candidate_session_by_hash: {
        Args: {
          p_token_hash: string;
          p_client_ip?: string;
          p_user_agent?: string;
        };
        Returns: Json;
      };
      submit_candidate_answer_by_hash: {
        Args: {
          p_token_hash: string;
          p_question_id: string;
          p_question_text: string;
          p_answer_text: string;
          p_time_spent_seconds: number;
        };
        Returns: Json;
      };
      complete_candidate_interview_by_hash: {
        Args: {
          p_token_hash: string;
          p_total_duration_seconds: number;
          p_evaluation?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
