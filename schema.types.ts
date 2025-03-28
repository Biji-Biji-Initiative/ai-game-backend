export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      challenge_format_types: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_system_defined: boolean | null
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_defined?: boolean | null
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_defined?: boolean | null
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      challenge_types: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          focus_areas: string[] | null
          format_types: string[] | null
          id: string
          is_active: boolean | null
          is_system_defined: boolean | null
          leveraged_traits: string[] | null
          metadata: Json | null
          name: string
          parent_type_id: string | null
          progression_path: string[] | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          focus_areas?: string[] | null
          format_types?: string[] | null
          id?: string
          is_active?: boolean | null
          is_system_defined?: boolean | null
          leveraged_traits?: string[] | null
          metadata?: Json | null
          name: string
          parent_type_id?: string | null
          progression_path?: string[] | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          focus_areas?: string[] | null
          format_types?: string[] | null
          id?: string
          is_active?: boolean | null
          is_system_defined?: boolean | null
          leveraged_traits?: string[] | null
          metadata?: Json | null
          name?: string
          parent_type_id?: string | null
          progression_path?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_types_parent_type_id_fkey"
            columns: ["parent_type_id"]
            isOneToOne: false
            referencedRelation: "challenge_types"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          ai_generated: boolean | null
          challenge_type_code: string
          challenge_type_id: string | null
          completed_at: string | null
          content: Json
          created_at: string | null
          difficulty: Database["public"]["Enums"]["challenge_difficulty"]
          difficulty_settings: Json | null
          evaluation: Json | null
          evaluation_criteria: Json | null
          evaluation_thread_id: string | null
          focus_area: string
          format_metadata: Json | null
          format_type_code: string
          format_type_id: string | null
          generation_metadata: Json | null
          generation_thread_id: string | null
          id: string
          questions: Json | null
          responses: Json | null
          status: Database["public"]["Enums"]["challenge_status"]
          submitted_at: string | null
          thread_id: string | null
          title: string
          type_metadata: Json | null
          updated_at: string | null
          user_email: string
        }
        Insert: {
          ai_generated?: boolean | null
          challenge_type_code: string
          challenge_type_id?: string | null
          completed_at?: string | null
          content: Json
          created_at?: string | null
          difficulty: Database["public"]["Enums"]["challenge_difficulty"]
          difficulty_settings?: Json | null
          evaluation?: Json | null
          evaluation_criteria?: Json | null
          evaluation_thread_id?: string | null
          focus_area: string
          format_metadata?: Json | null
          format_type_code: string
          format_type_id?: string | null
          generation_metadata?: Json | null
          generation_thread_id?: string | null
          id?: string
          questions?: Json | null
          responses?: Json | null
          status?: Database["public"]["Enums"]["challenge_status"]
          submitted_at?: string | null
          thread_id?: string | null
          title: string
          type_metadata?: Json | null
          updated_at?: string | null
          user_email: string
        }
        Update: {
          ai_generated?: boolean | null
          challenge_type_code?: string
          challenge_type_id?: string | null
          completed_at?: string | null
          content?: Json
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["challenge_difficulty"]
          difficulty_settings?: Json | null
          evaluation?: Json | null
          evaluation_criteria?: Json | null
          evaluation_thread_id?: string | null
          focus_area?: string
          format_metadata?: Json | null
          format_type_code?: string
          format_type_id?: string | null
          generation_metadata?: Json | null
          generation_thread_id?: string | null
          id?: string
          questions?: Json | null
          responses?: Json | null
          status?: Database["public"]["Enums"]["challenge_status"]
          submitted_at?: string | null
          thread_id?: string | null
          title?: string
          type_metadata?: Json | null
          updated_at?: string | null
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_challenge_type_id_fkey"
            columns: ["challenge_type_id"]
            isOneToOne: false
            referencedRelation: "challenge_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_format_type_id_fkey"
            columns: ["format_type_id"]
            isOneToOne: false
            referencedRelation: "challenge_format_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "user_activity_view"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "challenges_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "user_personality_view"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "challenges_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["email"]
          },
        ]
      }
      conversation_states: {
        Row: {
          context: string
          createdat: string | null
          id: string
          lastresponseid: string | null
          metadata: Json | null
          updatedat: string | null
          userid: string
        }
        Insert: {
          context: string
          createdat?: string | null
          id: string
          lastresponseid?: string | null
          metadata?: Json | null
          updatedat?: string | null
          userid: string
        }
        Update: {
          context?: string
          createdat?: string | null
          id?: string
          lastresponseid?: string | null
          metadata?: Json | null
          updatedat?: string | null
          userid?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          message_count: number | null
          updated_at: string | null
          user_email: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          message_count?: number | null
          updated_at?: string | null
          user_email?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_count?: number | null
          updated_at?: string | null
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "user_activity_view"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "conversations_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "user_personality_view"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "conversations_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["email"]
          },
        ]
      }
      difficulty_levels: {
        Row: {
          code: string
          context_complexity: number | null
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          question_count: number | null
          requirements: Json | null
          sort_order: number | null
          standard_time: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          context_complexity?: number | null
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          question_count?: number | null
          requirements?: Json | null
          sort_order?: number | null
          standard_time?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          context_complexity?: number | null
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          question_count?: number | null
          requirements?: Json | null
          sort_order?: number | null
          standard_time?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      evaluation_categories: {
        Row: {
          code: string
          created_at: string | null
          description: string
          id: string
          is_system_defined: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description: string
          id?: string
          is_system_defined?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string
          id?: string
          is_system_defined?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          areas_for_improvement: Json | null
          category_scores: Json | null
          challenge_id: string | null
          created_at: string | null
          evaluated_at: string | null
          evaluation_thread_id: string | null
          feedback: string | null
          feedback_points: Json | null
          id: string
          improvement_suggestions: Json | null
          is_streaming: boolean | null
          metadata: Json | null
          metrics: Json | null
          next_steps: string | null
          overall_feedback: string | null
          overall_score: number | null
          performance_metrics: Json | null
          response_id: string | null
          response_text: string | null
          score: number | null
          streaming_completed_at: string | null
          strength_analysis: Json | null
          strengths: Json | null
          submitted_at: string | null
          thread_id: string | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          areas_for_improvement?: Json | null
          category_scores?: Json | null
          challenge_id?: string | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluation_thread_id?: string | null
          feedback?: string | null
          feedback_points?: Json | null
          id?: string
          improvement_suggestions?: Json | null
          is_streaming?: boolean | null
          metadata?: Json | null
          metrics?: Json | null
          next_steps?: string | null
          overall_feedback?: string | null
          overall_score?: number | null
          performance_metrics?: Json | null
          response_id?: string | null
          response_text?: string | null
          score?: number | null
          streaming_completed_at?: string | null
          strength_analysis?: Json | null
          strengths?: Json | null
          submitted_at?: string | null
          thread_id?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          areas_for_improvement?: Json | null
          category_scores?: Json | null
          challenge_id?: string | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluation_thread_id?: string | null
          feedback?: string | null
          feedback_points?: Json | null
          id?: string
          improvement_suggestions?: Json | null
          is_streaming?: boolean | null
          metadata?: Json | null
          metrics?: Json | null
          next_steps?: string | null
          overall_feedback?: string | null
          overall_score?: number | null
          performance_metrics?: Json | null
          response_id?: string | null
          response_text?: string | null
          score?: number | null
          streaming_completed_at?: string | null
          strength_analysis?: Json | null
          strengths?: Json | null
          submitted_at?: string | null
          thread_id?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_activity_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_personality_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_area_category_mappings: {
        Row: {
          category_code: string
          created_at: string | null
          focus_area: string
          id: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          category_code: string
          created_at?: string | null
          focus_area: string
          id?: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          category_code?: string
          created_at?: string | null
          focus_area?: string
          id?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "focus_area_category_mappings_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "evaluation_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      focus_area_challenge_mappings: {
        Row: {
          challenge_type_code: string
          created_at: string | null
          focus_area: string
          id: string
          updated_at: string | null
        }
        Insert: {
          challenge_type_code: string
          created_at?: string | null
          focus_area: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          challenge_type_code?: string
          created_at?: string | null
          focus_area?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "focus_area_challenge_mappings_challenge_type_code_fkey"
            columns: ["challenge_type_code"]
            isOneToOne: false
            referencedRelation: "challenge_types"
            referencedColumns: ["code"]
          },
        ]
      }
      focus_areas: {
        Row: {
          code: string
          created_at: string | null
          description: string
          display_order: number | null
          id: string
          is_active: boolean | null
          learning_outcomes: Json | null
          metadata: Json | null
          name: string
          prerequisites: string[] | null
          related_areas: string[] | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          learning_outcomes?: Json | null
          metadata?: Json | null
          name: string
          prerequisites?: string[] | null
          related_areas?: string[] | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          learning_outcomes?: Json | null
          metadata?: Json | null
          name?: string
          prerequisites?: string[] | null
          related_areas?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      personality_insights: {
        Row: {
          created_at: string | null
          id: string
          insight_data: Json
          insight_type: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          insight_data: Json
          insight_type: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          insight_data?: Json
          insight_type?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personality_insights_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "user_activity_view"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "personality_insights_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "user_personality_view"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "personality_insights_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "personality_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_activity_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personality_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_personality_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "personality_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      personality_profiles: {
        Row: {
          created_at: string | null
          id: string
          profile_data: Json
          updated_at: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_data: Json
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_data?: Json
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personality_profiles_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "user_activity_view"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "personality_profiles_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "user_personality_view"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "personality_profiles_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "personality_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_activity_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personality_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_personality_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "personality_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          template: string
          updated_at: string | null
          variables: Json | null
          version: number | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template: string
          updated_at?: string | null
          variables?: Json | null
          version?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template?: string
          updated_at?: string | null
          variables?: Json | null
          version?: number | null
        }
        Relationships: []
      }
      thread_activity_logs: {
        Row: {
          activity_data: Json
          activity_type: string
          created_at: string | null
          id: string
          thread_id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          activity_data: Json
          activity_type: string
          created_at?: string | null
          id?: string
          thread_id: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          activity_data?: Json
          activity_type?: string
          created_at?: string | null
          id?: string
          thread_id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "thread_activity_logs_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "user_activity_view"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "thread_activity_logs_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "user_personality_view"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "thread_activity_logs_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "thread_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_activity_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_personality_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "thread_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trait_challenge_mappings: {
        Row: {
          challenge_type_code: string
          created_at: string | null
          id: string
          trait_code: string
          trait_name: string
          updated_at: string | null
        }
        Insert: {
          challenge_type_code: string
          created_at?: string | null
          id?: string
          trait_code: string
          trait_name: string
          updated_at?: string | null
        }
        Update: {
          challenge_type_code?: string
          created_at?: string | null
          id?: string
          trait_code?: string
          trait_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trait_challenge_mappings_challenge_type_code_fkey"
            columns: ["challenge_type_code"]
            isOneToOne: false
            referencedRelation: "challenge_types"
            referencedColumns: ["code"]
          },
        ]
      }
      user_journey_events: {
        Row: {
          created_at: string | null
          event_data: Json
          event_type: string
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data: Json
          event_type: string
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_journey_events_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "user_activity_view"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "user_journey_events_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "user_personality_view"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "user_journey_events_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "user_journey_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_activity_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_journey_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_personality_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_journey_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          average_score: number | null
          completed_challenges: number | null
          created_at: string | null
          focus_area: string
          id: string
          last_challenge_id: string | null
          last_completed_at: string | null
          progress_level: number | null
          skill_levels: Json | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          average_score?: number | null
          completed_challenges?: number | null
          created_at?: string | null
          focus_area: string
          id?: string
          last_challenge_id?: string | null
          last_completed_at?: string | null
          progress_level?: number | null
          skill_levels?: Json | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          average_score?: number | null
          completed_challenges?: number | null
          created_at?: string | null
          focus_area?: string
          id?: string
          last_challenge_id?: string | null
          last_completed_at?: string | null
          progress_level?: number | null
          skill_levels?: Json | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_last_challenge_id_fkey"
            columns: ["last_challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "user_activity_view"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "user_progress_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "user_personality_view"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "user_progress_user_email_fkey"
            columns: ["user_email"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["email"]
          },
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_activity_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_personality_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      user_activity_view: {
        Row: {
          average_score: number | null
          challenge_count: number | null
          completed_challenges: number | null
          conversation_count: number | null
          email: string | null
          evaluation_count: number | null
          focus_areas: Json | null
          id: string | null
          last_challenge_completed: string | null
          name: string | null
        }
        Relationships: []
      }
      user_personality_view: {
        Row: {
          email: string | null
          insights: Json | null
          name: string | null
          profile_data: Json | null
          profile_updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      upsert_custom_challenge_type: {
        Args: {
          p_code: string
          p_name: string
          p_description: string
          p_parent_code?: string
          p_metadata?: Json
        }
        Returns: string
      }
    }
    Enums: {
      challenge_difficulty: "beginner" | "intermediate" | "advanced" | "expert"
      challenge_status: "active" | "submitted" | "completed" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
