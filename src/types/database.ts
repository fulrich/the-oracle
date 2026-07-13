export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
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
  public: {
    Tables: {
      admin_audit_events: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: number;
          new_data: Json | null;
          previous_data: Json | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: never;
          new_data?: Json | null;
          previous_data?: Json | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: never;
          new_data?: Json | null;
          previous_data?: Json | null;
        };
        Relationships: [];
      };
      allowed_users: {
        Row: {
          active: boolean;
          auth_user_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          normalized_email: string;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          auth_user_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          normalized_email: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          auth_user_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          normalized_email?: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      character_assignments: {
        Row: {
          allowed_user_id: string;
          assigned_at: string;
          assigned_by: string | null;
          character_id: string;
          updated_at: string;
        };
        Insert: {
          allowed_user_id: string;
          assigned_at?: string;
          assigned_by?: string | null;
          character_id: string;
          updated_at?: string;
        };
        Update: {
          allowed_user_id?: string;
          assigned_at?: string;
          assigned_by?: string | null;
          character_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "character_assignments_allowed_user_id_fkey";
            columns: ["allowed_user_id"];
            isOneToOne: true;
            referencedRelation: "allowed_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "character_assignments_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: true;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
        ];
      };
      characters: {
        Row: {
          archive_note: string | null;
          created_at: string;
          created_by: string | null;
          display_name: string;
          id: string;
          initials: string;
          slug: string;
          subtitle: string | null;
          updated_at: string;
        };
        Insert: {
          archive_note?: string | null;
          created_at?: string;
          created_by?: string | null;
          display_name: string;
          id?: string;
          initials: string;
          slug: string;
          subtitle?: string | null;
          updated_at?: string;
        };
        Update: {
          archive_note?: string | null;
          created_at?: string;
          created_by?: string | null;
          display_name?: string;
          id?: string;
          initials?: string;
          slug?: string;
          subtitle?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      memories: {
        Row: {
          artwork_alt: string | null;
          chapter_label: string;
          character_id: string;
          created_at: string;
          created_by: string | null;
          excerpt: string;
          id: string;
          markdown_body: string;
          position: number;
          publication_status: Database["public"]["Enums"]["memory_publication_status"];
          slug: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          artwork_alt?: string | null;
          chapter_label: string;
          character_id: string;
          created_at?: string;
          created_by?: string | null;
          excerpt: string;
          id?: string;
          markdown_body: string;
          position: number;
          publication_status?: Database["public"]["Enums"]["memory_publication_status"];
          slug: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          artwork_alt?: string | null;
          chapter_label?: string;
          character_id?: string;
          created_at?: string;
          created_by?: string | null;
          excerpt?: string;
          id?: string;
          markdown_body?: string;
          position?: number;
          publication_status?: Database["public"]["Enums"]["memory_publication_status"];
          slug?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "memories_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
        ];
      };
      memory_media: {
        Row: {
          character_id: string;
          created_at: string;
          created_by: string | null;
          file_name: string;
          folder: string;
          height: number | null;
          id: string;
          memory_id: string | null;
          mime_type: string;
          purpose: Database["public"]["Enums"]["memory_media_purpose"];
          sort_order: number;
          storage_object_name: string;
          updated_at: string;
          width: number | null;
        };
        Insert: {
          character_id: string;
          created_at?: string;
          created_by?: string | null;
          file_name: string;
          folder?: string;
          height?: number | null;
          id?: string;
          memory_id?: string | null;
          mime_type: string;
          purpose: Database["public"]["Enums"]["memory_media_purpose"];
          sort_order?: number;
          storage_object_name: string;
          updated_at?: string;
          width?: number | null;
        };
        Update: {
          character_id?: string;
          created_at?: string;
          created_by?: string | null;
          file_name?: string;
          folder?: string;
          height?: number | null;
          id?: string;
          memory_id?: string | null;
          mime_type?: string;
          purpose?: Database["public"]["Enums"]["memory_media_purpose"];
          sort_order?: number;
          storage_object_name?: string;
          updated_at?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "memory_media_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memory_media_memory_id_fkey";
            columns: ["memory_id"];
            isOneToOne: false;
            referencedRelation: "memories";
            referencedColumns: ["id"];
          },
        ];
      };
      memory_reveals: {
        Row: {
          memory_id: string;
          revealed_at: string;
          revealed_by: string | null;
        };
        Insert: {
          memory_id: string;
          revealed_at?: string;
          revealed_by?: string | null;
        };
        Update: {
          memory_id?: string;
          revealed_at?: string;
          revealed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "memory_reveals_memory_id_fkey";
            columns: ["memory_id"];
            isOneToOne: true;
            referencedRelation: "memories";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      assign_player_to_character: {
        Args: { target_character_id: string; target_email: string };
        Returns: string;
      };
      visible_character_memory_archive: {
        Args: { target_character_id: string };
        Returns: {
          archive_note: string;
          artwork_alt: string;
          chapter_label: string;
          character_display_name: string;
          character_id: string;
          character_initials: string;
          character_slug: string;
          character_subtitle: string;
          excerpt: string;
          markdown_body: string;
          memory_id: string;
          memory_position: number;
          memory_slug: string;
          revealed_at: string;
          title: string;
        }[];
      };
      visible_memory_archive: {
        Args: { target_allowed_user_id?: string };
        Returns: {
          archive_note: string;
          artwork_alt: string;
          chapter_label: string;
          character_display_name: string;
          character_id: string;
          character_initials: string;
          character_slug: string;
          character_subtitle: string;
          excerpt: string;
          markdown_body: string;
          memory_id: string;
          memory_position: number;
          memory_slug: string;
          revealed_at: string;
          title: string;
        }[];
      };
    };
    Enums: {
      app_role: "admin" | "player";
      memory_media_purpose: "hero" | "card" | "attachment";
      memory_publication_status: "draft" | "published" | "archived";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "player"],
      memory_media_purpose: ["hero", "card", "attachment"],
      memory_publication_status: ["draft", "published", "archived"],
    },
  },
} as const;
