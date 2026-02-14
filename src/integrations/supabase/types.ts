export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_configs: {
        Row: {
          behavior: Json
          created_at: string
          enabled: boolean
          graphic: string
          id: string
          inventory: string[]
          model: Json
          name: string
          personality: string
          skills: string[]
          spawn: Json
          updated_at: string
        }
        Insert: {
          behavior?: Json
          created_at?: string
          enabled?: boolean
          graphic: string
          id: string
          inventory?: string[]
          model?: Json
          name: string
          personality: string
          skills?: string[]
          spawn: Json
          updated_at?: string
        }
        Update: {
          behavior?: Json
          created_at?: string
          enabled?: boolean
          graphic?: string
          id?: string
          inventory?: string[]
          model?: Json
          name?: string
          personality?: string
          skills?: string[]
          spawn?: Json
          updated_at?: string
        }
        Relationships: []
      }
      agent_memory: {
        Row: {
          agent_id: string
          content: string
          created_at: string
          id: string
          importance: number
          metadata: Json
          role: string
        }
        Insert: {
          agent_id: string
          content: string
          created_at?: string
          id?: string
          importance?: number
          metadata?: Json
          role: string
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string
          id?: string
          importance?: number
          metadata?: Json
          role?: string
        }
        Relationships: []
      }
      api_integrations: {
        Row: {
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          required_item_id: string
          requires_env: string[]
          skill_name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id: string
          name: string
          required_item_id: string
          requires_env?: string[]
          skill_name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          required_item_id?: string
          requires_env?: string[]
          skill_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_state: {
        Row: {
          created_at: string | null
          direction: number | null
          map_id: string | null
          name: string | null
          player_id: string
          position_x: number | null
          position_y: number | null
          state_data: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          direction?: number | null
          map_id?: string | null
          name?: string | null
          player_id: string
          position_x?: number | null
          position_y?: number | null
          state_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: number | null
          map_id?: string | null
          name?: string | null
          player_id?: string
          position_x?: number | null
          position_y?: number | null
          state_data?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      studio_activity_log: {
        Row: {
          created_at: string
          id: string
          message: string
          type: string
          user_id: string
          workflow_id: string | null
          workflow_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          type: string
          user_id?: string
          workflow_id?: string | null
          workflow_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          type?: string
          user_id?: string
          workflow_id?: string | null
          workflow_name?: string | null
        }
        Relationships: []
      }
      studio_agent_memory: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          workflow_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          workflow_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_agent_memory_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "studio_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          node_results: Json
          started_at: string
          status: string
          user_id: string
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          node_results?: Json
          started_at?: string
          status?: string
          user_id?: string
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          node_results?: Json
          started_at?: string
          status?: string
          user_id?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "studio_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_workflows: {
        Row: {
          connections_data: Json
          created_at: string
          description: string | null
          execution_count: number
          id: string
          last_run_at: string | null
          name: string
          node_count: number
          nodes_data: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connections_data?: Json
          created_at?: string
          description?: string | null
          execution_count?: number
          id?: string
          last_run_at?: string | null
          name: string
          node_count?: number
          nodes_data?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          connections_data?: Json
          created_at?: string
          description?: string | null
          execution_count?: number
          id?: string
          last_run_at?: string | null
          name?: string
          node_count?: number
          nodes_data?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_agent_configs_for_map: {
        Args: { p_map_id: string }
        Returns: {
          behavior: Json
          created_at: string
          enabled: boolean
          graphic: string
          id: string
          inventory: string[]
          model: Json
          name: string
          personality: string
          skills: string[]
          spawn: Json
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "agent_configs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
