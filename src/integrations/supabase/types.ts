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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string | null
          id: string
          mercado_pago_access_token: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mercado_pago_access_token?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mercado_pago_access_token?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_phrases: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          text: string
          type: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          text: string
          type: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          text?: string
          type?: string
        }
        Relationships: []
      }
      auctions: {
        Row: {
          bid_count: number | null
          confirmed_at: string | null
          created_at: string
          current_price: number | null
          end_time: string | null
          id: string
          is_finalizing: boolean | null
          last_bidder_id: string | null
          min_balance_required: number | null
          modality: string | null
          product_id: string | null
          robot_enabled: boolean | null
          start_time: string | null
          status: string | null
          target_winner: string | null
          timer_duration: number | null
        }
        Insert: {
          bid_count?: number | null
          confirmed_at?: string | null
          created_at?: string
          current_price?: number | null
          end_time?: string | null
          id?: string
          is_finalizing?: boolean | null
          last_bidder_id?: string | null
          min_balance_required?: number | null
          modality?: string | null
          product_id?: string | null
          robot_enabled?: boolean | null
          start_time?: string | null
          status?: string | null
          target_winner?: string | null
          timer_duration?: number | null
        }
        Update: {
          bid_count?: number | null
          confirmed_at?: string | null
          created_at?: string
          current_price?: number | null
          end_time?: string | null
          id?: string
          is_finalizing?: boolean | null
          last_bidder_id?: string | null
          min_balance_required?: number | null
          modality?: string | null
          product_id?: string | null
          robot_enabled?: boolean | null
          start_time?: string | null
          status?: string | null
          target_winner?: string | null
          timer_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_last_bidder_id_fkey"
            columns: ["last_bidder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_last_bidder_id_fkey"
            columns: ["last_bidder_id"]
            isOneToOne: false
            referencedRelation: "v_user_ranking"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "auctions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          active: boolean | null
          created_at: string | null
          end_at: string | null
          id: string
          image_url: string
          link_url: string | null
          order_index: number | null
          start_at: string | null
          subtitle: string | null
          title: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          end_at?: string | null
          id?: string
          image_url: string
          link_url?: string | null
          order_index?: number | null
          start_at?: string | null
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          end_at?: string | null
          id?: string
          image_url?: string
          link_url?: string | null
          order_index?: number | null
          start_at?: string | null
          subtitle?: string | null
          title?: string | null
        }
        Relationships: []
      }
      bid_packages: {
        Row: {
          bid_amount: number
          created_at: string
          id: string
          image_url: string | null
          name: string
          price: number
        }
        Insert: {
          bid_amount: number
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          price: number
        }
        Update: {
          bid_amount?: number
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      bids: {
        Row: {
          auction_id: string | null
          created_at: string
          id: string
          price_at_bid: number | null
          user_id: string | null
        }
        Insert: {
          auction_id?: string | null
          created_at?: string
          id?: string
          price_at_bid?: number | null
          user_id?: string | null
        }
        Update: {
          auction_id?: string | null
          created_at?: string
          id?: string
          price_at_bid?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "v_home_live_auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          auction_id: string | null
          created_at: string
          id: string
          message: string
          user_id: string | null
        }
        Insert: {
          auction_id?: string | null
          created_at?: string
          id?: string
          message: string
          user_id?: string | null
        }
        Update: {
          auction_id?: string | null
          created_at?: string
          id?: string
          message?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "v_home_live_auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          market_value: number
          name: string
          slug: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          market_value: number
          name: string
          slug?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          market_value?: number
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      profile_secrets: {
        Row: {
          cpf: string | null
          created_at: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_secrets_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_secrets_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_user_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bid_balance: number | null
          city: string | null
          cpf: string | null
          created_at: string
          full_name: string | null
          gender: string | null
          id: string
          is_admin: boolean | null
          is_bot: boolean | null
          phone: string | null
          state: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bid_balance?: number | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          id: string
          is_admin?: boolean | null
          is_bot?: boolean | null
          phone?: string | null
          state?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bid_balance?: number | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          id?: string
          is_admin?: boolean | null
          is_bot?: boolean | null
          phone?: string | null
          state?: string | null
          username?: string | null
        }
        Relationships: []
      }
      robot_settings: {
        Row: {
          active: boolean | null
          auction_id: string | null
          bid_chance: number | null
          created_at: string
          dispute_duration_minutes: number | null
          id: string
          inner_dispute_enabled: boolean | null
          inner_dispute_end_at: string | null
          last_robot_bid_at: string | null
          max_bids_per_robot: number | null
          max_delay: number | null
          min_delay: number | null
          start_after_minutes: number | null
          stop_after_minutes: number | null
        }
        Insert: {
          active?: boolean | null
          auction_id?: string | null
          bid_chance?: number | null
          created_at?: string
          dispute_duration_minutes?: number | null
          id?: string
          inner_dispute_enabled?: boolean | null
          inner_dispute_end_at?: string | null
          last_robot_bid_at?: string | null
          max_bids_per_robot?: number | null
          max_delay?: number | null
          min_delay?: number | null
          start_after_minutes?: number | null
          stop_after_minutes?: number | null
        }
        Update: {
          active?: boolean | null
          auction_id?: string | null
          bid_chance?: number | null
          created_at?: string
          dispute_duration_minutes?: number | null
          id?: string
          inner_dispute_enabled?: boolean | null
          inner_dispute_end_at?: string | null
          last_robot_bid_at?: string | null
          max_bids_per_robot?: number | null
          max_delay?: number | null
          min_delay?: number | null
          start_after_minutes?: number | null
          stop_after_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "robot_settings_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: true
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "robot_settings_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: true
            referencedRelation: "v_home_live_auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      robot_users: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          id: string
          state: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          id?: string
          state?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          id?: string
          state?: string | null
          username?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          block_background_color: string | null
          border_color: string | null
          card_background_color: string | null
          favicon_url: string | null
          fb_pixel_id: string | null
          font_color_primary: string | null
          font_color_secondary: string | null
          ga_id: string | null
          google_reviews_widget: string | null
          google_site_verification: string | null
          hero_display_mode: string | null
          id: string
          logo_height: number | null
          logo_height_mobile: number | null
          logo_padding_x: number | null
          logo_padding_y: number | null
          logo_url: string | null
          mercado_pago_public_key: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          page_background_color: string | null
          pix_key: string | null
          pix_name: string | null
          primary_color: string | null
          secondary_color: string | null
          site_name: string | null
          theme_mode: string | null
          updated_at: string | null
        }
        Insert: {
          block_background_color?: string | null
          border_color?: string | null
          card_background_color?: string | null
          favicon_url?: string | null
          fb_pixel_id?: string | null
          font_color_primary?: string | null
          font_color_secondary?: string | null
          ga_id?: string | null
          google_reviews_widget?: string | null
          google_site_verification?: string | null
          hero_display_mode?: string | null
          id?: string
          logo_height?: number | null
          logo_height_mobile?: number | null
          logo_padding_x?: number | null
          logo_padding_y?: number | null
          logo_url?: string | null
          mercado_pago_public_key?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          page_background_color?: string | null
          pix_key?: string | null
          pix_name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          site_name?: string | null
          theme_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          block_background_color?: string | null
          border_color?: string | null
          card_background_color?: string | null
          favicon_url?: string | null
          fb_pixel_id?: string | null
          font_color_primary?: string | null
          font_color_secondary?: string | null
          ga_id?: string | null
          google_reviews_widget?: string | null
          google_site_verification?: string | null
          hero_display_mode?: string | null
          id?: string
          logo_height?: number | null
          logo_height_mobile?: number | null
          logo_padding_x?: number | null
          logo_padding_y?: number | null
          logo_url?: string | null
          mercado_pago_public_key?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          page_background_color?: string | null
          pix_key?: string | null
          pix_name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          site_name?: string | null
          theme_mode?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          active: boolean | null
          avatar_url: string | null
          content: string
          created_at: string | null
          id: string
          name: string
          rating: number | null
        }
        Insert: {
          active?: boolean | null
          avatar_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          name: string
          rating?: number | null
        }
        Update: {
          active?: boolean | null
          avatar_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          rating?: number | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          external_id: string | null
          id: string
          package_id: string | null
          payment_method: string | null
          pix_copy_paste: string | null
          pix_qr_code: string | null
          status: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          package_id?: string | null
          payment_method?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          status?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          package_id?: string | null
          payment_method?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          status?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "bid_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      winners: {
        Row: {
          auction_id: string | null
          created_at: string
          final_price: number
          id: string
          savings_percentage: number | null
          user_id: string | null
        }
        Insert: {
          auction_id?: string | null
          created_at?: string
          final_price: number
          id?: string
          savings_percentage?: number | null
          user_id?: string | null
        }
        Update: {
          auction_id?: string | null
          created_at?: string
          final_price?: number
          id?: string
          savings_percentage?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "winners_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: true
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: true
            referencedRelation: "v_home_live_auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      v_home_live_auctions: {
        Row: {
          bid_count: number | null
          confirmed_at: string | null
          current_price: number | null
          end_time: string | null
          id: string | null
          is_finalizing: boolean | null
          last_bidder: Json | null
          min_balance_required: number | null
          modality: string | null
          product: Json | null
          product_id: string | null
          robot_enabled: boolean | null
          start_time: string | null
          status: string | null
          target_winner: string | null
          timer_duration: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      v_home_recent_winners: {
        Row: {
          auction: Json | null
          created_at: string | null
          final_price: number | null
          id: string | null
          profile: Json | null
          savings_percentage: number | null
        }
        Relationships: []
      }
      v_user_ranking: {
        Row: {
          avatar_url: string | null
          avg_savings: number | null
          full_name: string | null
          total_savings_sum: number | null
          total_wins: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_bids_to_user: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      buy_credits: { Args: { p_package_id: string }; Returns: Json }
      check_is_admin: { Args: never; Returns: boolean }
      complete_payment: {
        Args: { p_external_id?: string; p_transaction_id: string }
        Returns: Json
      }
      confirm_auction_winner: { Args: { p_auction_id: string }; Returns: Json }
      create_pending_payment:
        | { Args: { p_method: string; p_package_id: string }; Returns: Json }
        | {
            Args: { p_method: string; p_package_id: string; p_user_id?: string }
            Returns: Json
          }
      ensure_live_auctions_robot_settings: { Args: never; Returns: undefined }
      get_server_time: { Args: never; Returns: string }
      increment_bid_balance: {
        Args: { p_amount: number; p_user_id: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      place_bid:
        | { Args: { p_auction_id: string }; Returns: Json }
        | { Args: { p_auction_id: string; p_user_id: string }; Returns: Json }
      place_robot_bid: {
        Args: { p_auction_id: string; p_robot_id: string }
        Returns: Json
      }
      process_robot_bids: { Args: never; Returns: Json }
      slugify: { Args: { v_text: string }; Returns: string }
      tick_auctions: { Args: never; Returns: Json }
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
