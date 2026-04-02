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
      concerts: {
        Row: {
          created_at: string
          description: string | null
          genre: string | null
          id: string
          is_active: boolean
          poster_url: string | null
          rating: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean
          poster_url?: string | null
          rating?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean
          poster_url?: string | null
          rating?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          genre: string | null
          id: string
          is_active: boolean
          poster_url: string | null
          rating: string | null
          rsvp_url: string | null
          ticket_type: Database["public"]["Enums"]["event_ticket_type"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean
          poster_url?: string | null
          rating?: string | null
          rsvp_url?: string | null
          ticket_type?: Database["public"]["Enums"]["event_ticket_type"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean
          poster_url?: string | null
          rating?: string | null
          rsvp_url?: string | null
          ticket_type?: Database["public"]["Enums"]["event_ticket_type"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      movies: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          genre: string | null
          id: string
          is_active: boolean
          poster_url: string | null
          rating: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          genre?: string | null
          id?: string
          is_active?: boolean
          poster_url?: string | null
          rating?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          genre?: string | null
          id?: string
          is_active?: boolean
          poster_url?: string | null
          rating?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seats: {
        Row: {
          id: string
          seat_number: number
          seat_row: string
          seat_type: string
        }
        Insert: {
          id?: string
          seat_number: number
          seat_row: string
          seat_type?: string
        }
        Update: {
          id?: string
          seat_number?: number
          seat_row?: string
          seat_type?: string
        }
        Relationships: []
      }
      showings: {
        Row: {
          concert_id: string | null
          created_at: string
          event_id: string | null
          id: string
          is_active: boolean
          movie_id: string | null
          requires_seat_selection: boolean
          start_time: string
          ticket_price: number
          total_seats: number
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          concert_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          is_active?: boolean
          movie_id?: string | null
          requires_seat_selection?: boolean
          start_time: string
          ticket_price?: number
          total_seats?: number
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          concert_id?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          is_active?: boolean
          movie_id?: string | null
          requires_seat_selection?: boolean
          start_time?: string
          ticket_price?: number
          total_seats?: number
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "showings_concert_id_fkey"
            columns: ["concert_id"]
            isOneToOne: false
            referencedRelation: "concerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showings_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          id: string
          payment_method: string
          price: number
          purchased_at: string
          qr_code: string | null
          scanned_at: string | null
          seat_id: string | null
          showing_id: string
          status: string
          tax_amount: number
          tax_rate: number
          total_price: number
          user_id: string
        }
        Insert: {
          id?: string
          payment_method?: string
          price: number
          purchased_at?: string
          qr_code?: string | null
          scanned_at?: string | null
          seat_id?: string | null
          showing_id: string
          status?: string
          tax_amount: number
          tax_rate?: number
          total_price: number
          user_id: string
        }
        Update: {
          id?: string
          payment_method?: string
          price?: number
          purchased_at?: string
          qr_code?: string | null
          scanned_at?: string | null
          seat_id?: string | null
          showing_id?: string
          status?: string
          tax_amount?: number
          tax_rate?: number
          total_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_showing_id_fkey"
            columns: ["showing_id"]
            isOneToOne: false
            referencedRelation: "showings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venue_seats: {
        Row: {
          id: string
          seat_number: number
          seat_row: string
          seat_type: string
          venue_id: string
        }
        Insert: {
          id?: string
          seat_number: number
          seat_row: string
          seat_type?: string
          venue_id: string
        }
        Update: {
          id?: string
          seat_number?: number
          seat_row?: string
          seat_type?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_seats_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          created_at: string
          description: string | null
          has_assigned_seating: boolean
          id: string
          is_active: boolean
          name: string
          total_seats: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          has_assigned_seating?: boolean
          id?: string
          is_active?: boolean
          name: string
          total_seats?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          has_assigned_seating?: boolean
          id?: string
          is_active?: boolean
          name?: string
          total_seats?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "regular_user" | "staff"
      event_ticket_type: "ticketed" | "rsvp" | "info_only"
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
    Enums: {
      app_role: ["admin", "regular_user", "staff"],
      event_ticket_type: ["ticketed", "rsvp", "info_only"],
    },
  },
} as const
