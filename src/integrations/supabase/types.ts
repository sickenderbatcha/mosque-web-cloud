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
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      admin_pdf_documents: {
        Row: {
          created_at: string
          description: string | null
          document_name: string
          document_type: string
          file_path: string
          file_size: number | null
          id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_name: string
          document_type: string
          file_path: string
          file_size?: number | null
          id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_name?: string
          document_type?: string
          file_path?: string
          file_size?: number | null
          id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          content_tamil: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          start_date: string | null
          title: string
          title_tamil: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          content: string
          content_tamil?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          title: string
          title_tamil?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          content_tamil?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          title?: string
          title_tamil?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      asset_locations: {
        Row: {
          created_at: string
          id: string
          name: string
          name_tamil: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_tamil?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_tamil?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      asset_maintenance_logs: {
        Row: {
          asset_id: string
          cost: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          maintenance_date: string
          maintenance_type: string
          performed_by: string | null
        }
        Insert: {
          asset_id: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          maintenance_date?: string
          maintenance_type: string
          performed_by?: string | null
        }
        Update: {
          asset_id?: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          maintenance_date?: string
          maintenance_type?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          location_id: string
          name: string
          notes: string | null
          purchase_date: string | null
          serial_number: string | null
          status: string
          updated_at: string
          value: number | null
          warranty_expiry_date: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          location_id: string
          name: string
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
          value?: number | null
          warranty_expiry_date?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string
          name?: string
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
          value?: number | null
          warranty_expiry_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "asset_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_otp_tokens: {
        Row: {
          attempts: number
          created_at: string
          email: string | null
          expires_at: string
          id: string
          otp_code: string
          phone: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          email?: string | null
          expires_at: string
          id?: string
          otp_code: string
          phone: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          otp_code?: string
          phone?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      cash_payment_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          applicant_email: string | null
          applicant_name: string
          applicant_phone: string
          created_at: string
          failure_reason: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          reference_id: string | null
          service_details: Json | null
          service_type: string
          status: string
          updated_at: string
          user_id: string | null
          user_notes: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          applicant_email?: string | null
          applicant_name: string
          applicant_phone: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reference_id?: string | null
          service_details?: Json | null
          service_type: string
          status?: string
          updated_at?: string
          user_id?: string | null
          user_notes?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          applicant_email?: string | null
          applicant_name?: string
          applicant_phone?: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reference_id?: string | null
          service_details?: Json | null
          service_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          user_notes?: string | null
        }
        Relationships: []
      }
      certificate_payments: {
        Row: {
          admin_notes: string | null
          amount: number
          applicant_email: string | null
          applicant_name: string
          applicant_phone: string
          certificate_type: string
          created_at: string
          id: string
          payment_method: string | null
          payment_status: string
          processed_by: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          reference_id: string
          transaction_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount?: number
          applicant_email?: string | null
          applicant_name: string
          applicant_phone: string
          certificate_type: string
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_status?: string
          processed_by?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          reference_id: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          applicant_email?: string | null
          applicant_name?: string
          applicant_phone?: string
          certificate_type?: string
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_status?: string
          processed_by?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          reference_id?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      death_registers: {
        Row: {
          burial_date: string | null
          burial_place: string | null
          burial_place_en: string | null
          burial_time: string | null
          cause_of_death: string | null
          created_at: string
          created_by: string | null
          day_name: string
          death_date: string
          death_time: string | null
          deceased_address: string
          deceased_age: number
          deceased_father_name: string
          deceased_father_name_en: string | null
          deceased_gender: string
          deceased_husband_name: string | null
          deceased_husband_name_en: string | null
          deceased_name: string
          deceased_name_en: string | null
          deceased_occupation: string | null
          gregorian_day: number
          gregorian_month: string
          gregorian_year: number
          hijri_day: number
          hijri_month: string
          hijri_year: number
          id: string
          informant_address: string | null
          informant_name: string
          informant_name_en: string | null
          informant_phone: string | null
          informant_relationship: string
          member_id: string | null
          place_of_death: string
          register_page_number: string | null
          registrar_father_name: string | null
          registrar_name: string
          updated_at: string
          witness1_father_name: string | null
          witness1_name: string | null
          witness1_name_en: string | null
          witness2_father_name: string | null
          witness2_name: string | null
          witness2_name_en: string | null
        }
        Insert: {
          burial_date?: string | null
          burial_place?: string | null
          burial_place_en?: string | null
          burial_time?: string | null
          cause_of_death?: string | null
          created_at?: string
          created_by?: string | null
          day_name: string
          death_date: string
          death_time?: string | null
          deceased_address: string
          deceased_age: number
          deceased_father_name: string
          deceased_father_name_en?: string | null
          deceased_gender?: string
          deceased_husband_name?: string | null
          deceased_husband_name_en?: string | null
          deceased_name: string
          deceased_name_en?: string | null
          deceased_occupation?: string | null
          gregorian_day: number
          gregorian_month: string
          gregorian_year: number
          hijri_day: number
          hijri_month: string
          hijri_year: number
          id?: string
          informant_address?: string | null
          informant_name: string
          informant_name_en?: string | null
          informant_phone?: string | null
          informant_relationship: string
          member_id?: string | null
          place_of_death: string
          register_page_number?: string | null
          registrar_father_name?: string | null
          registrar_name: string
          updated_at?: string
          witness1_father_name?: string | null
          witness1_name?: string | null
          witness1_name_en?: string | null
          witness2_father_name?: string | null
          witness2_name?: string | null
          witness2_name_en?: string | null
        }
        Update: {
          burial_date?: string | null
          burial_place?: string | null
          burial_place_en?: string | null
          burial_time?: string | null
          cause_of_death?: string | null
          created_at?: string
          created_by?: string | null
          day_name?: string
          death_date?: string
          death_time?: string | null
          deceased_address?: string
          deceased_age?: number
          deceased_father_name?: string
          deceased_father_name_en?: string | null
          deceased_gender?: string
          deceased_husband_name?: string | null
          deceased_husband_name_en?: string | null
          deceased_name?: string
          deceased_name_en?: string | null
          deceased_occupation?: string | null
          gregorian_day?: number
          gregorian_month?: string
          gregorian_year?: number
          hijri_day?: number
          hijri_month?: string
          hijri_year?: number
          id?: string
          informant_address?: string | null
          informant_name?: string
          informant_name_en?: string | null
          informant_phone?: string | null
          informant_relationship?: string
          member_id?: string | null
          place_of_death?: string
          register_page_number?: string | null
          registrar_father_name?: string | null
          registrar_name?: string
          updated_at?: string
          witness1_father_name?: string | null
          witness1_name?: string | null
          witness1_name_en?: string | null
          witness2_father_name?: string | null
          witness2_name?: string | null
          witness2_name_en?: string | null
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          donated_at: string | null
          donor_address: string | null
          donor_email: string | null
          donor_name: string
          donor_phone: string | null
          id: string
          is_anonymous: boolean | null
          payment_method: string | null
          payment_status: string | null
          purpose: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          receipt_number: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          donated_at?: string | null
          donor_address?: string | null
          donor_email?: string | null
          donor_name: string
          donor_phone?: string | null
          id?: string
          is_anonymous?: boolean | null
          payment_method?: string | null
          payment_status?: string | null
          purpose?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          receipt_number?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          donated_at?: string | null
          donor_address?: string | null
          donor_email?: string | null
          donor_name?: string
          donor_phone?: string | null
          id?: string
          is_anonymous?: boolean | null
          payment_method?: string | null
          payment_status?: string | null
          purpose?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          receipt_number?: string | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          event_id: string
          id: string
          participant_email: string | null
          participant_name: string
          participant_phone: string
          registered_at: string | null
          user_id: string | null
        }
        Insert: {
          event_id: string
          id?: string
          participant_email?: string | null
          participant_name: string
          participant_phone: string
          registered_at?: string | null
          user_id?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          participant_email?: string | null
          participant_name?: string
          participant_phone?: string
          registered_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          description_tamil: string | null
          end_time: string | null
          event_date: string
          id: string
          image_url: string | null
          is_featured: boolean | null
          max_participants: number | null
          registration_required: boolean | null
          start_time: string | null
          status: Database["public"]["Enums"]["event_status"] | null
          title: string
          title_tamil: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_tamil?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          max_participants?: number | null
          registration_required?: boolean | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          title: string
          title_tamil?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_tamil?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          max_participants?: number | null
          registration_required?: boolean | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          title?: string
          title_tamil?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          invoice_number: string | null
          payment_method: string | null
          receipt_number: string | null
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          invoice_number?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          invoice_number?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string | null
          id: string
          image_url: string
          is_featured: boolean | null
          sort_order: number | null
          title: string
          title_tamil: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          image_url: string
          is_featured?: boolean | null
          sort_order?: number | null
          title: string
          title_tamil?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          image_url?: string
          is_featured?: boolean | null
          sort_order?: number | null
          title?: string
          title_tamil?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gb_family_members: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          id: string
          is_alive: boolean
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          member_id: string
          name: string
          phone_number: string | null
          relationship: Database["public"]["Enums"]["family_relationship"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          is_alive?: boolean
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          member_id: string
          name: string
          phone_number?: string | null
          relationship: Database["public"]["Enums"]["family_relationship"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          is_alive?: boolean
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          member_id?: string
          name?: string
          phone_number?: string | null
          relationship?: Database["public"]["Enums"]["family_relationship"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gb_family_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "gb_members"
            referencedColumns: ["id"]
          },
        ]
      }
      gb_members: {
        Row: {
          address: string | null
          auth_user_id: string | null
          blood_group: Database["public"]["Enums"]["blood_group"] | null
          created_at: string
          date_of_birth: string | null
          date_of_marriage: string
          email: string | null
          family_name: string | null
          father_name: string
          full_name: string
          id: string
          is_active: boolean | null
          joined_at: string | null
          member_id: string
          occupation: string | null
          phone: string | null
          photo_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          blood_group?: Database["public"]["Enums"]["blood_group"] | null
          created_at?: string
          date_of_birth?: string | null
          date_of_marriage: string
          email?: string | null
          family_name?: string | null
          father_name: string
          full_name: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          member_id: string
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          blood_group?: Database["public"]["Enums"]["blood_group"] | null
          created_at?: string
          date_of_birth?: string | null
          date_of_marriage?: string
          email?: string | null
          family_name?: string | null
          father_name?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          member_id?: string
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      grievances: {
        Row: {
          admin_response: string | null
          category: string | null
          complainant_email: string | null
          complainant_name: string
          complainant_phone: string
          created_at: string
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["grievance_status"] | null
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_response?: string | null
          category?: string | null
          complainant_email?: string | null
          complainant_name: string
          complainant_phone: string
          created_at?: string
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["grievance_status"] | null
          subject: string
          ticket_number: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_response?: string | null
          category?: string | null
          complainant_email?: string | null
          complainant_name?: string
          complainant_phone?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["grievance_status"] | null
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      heir_certificates: {
        Row: {
          admin_notes: string | null
          applicant_email: string | null
          applicant_name: string
          applicant_phone: string | null
          applicant_relationship: string
          approved_at: string | null
          approved_by: string | null
          certificate_date: string | null
          created_at: string
          deceased_address: string
          deceased_father_name: string
          deceased_member_id: string | null
          deceased_name: string
          heirs: Json
          id: string
          payment_status: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          register_number: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          applicant_email?: string | null
          applicant_name: string
          applicant_phone?: string | null
          applicant_relationship: string
          approved_at?: string | null
          approved_by?: string | null
          certificate_date?: string | null
          created_at?: string
          deceased_address: string
          deceased_father_name: string
          deceased_member_id?: string | null
          deceased_name: string
          heirs?: Json
          id?: string
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          register_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          applicant_email?: string | null
          applicant_name?: string
          applicant_phone?: string | null
          applicant_relationship?: string
          approved_at?: string | null
          approved_by?: string | null
          certificate_date?: string | null
          created_at?: string
          deceased_address?: string
          deceased_father_name?: string
          deceased_member_id?: string | null
          deceased_name?: string
          heirs?: Json
          id?: string
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          register_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      income: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          income_date: string
          payment_method: string | null
          receipt_number: string | null
          reference_id: string | null
          reference_type: string | null
          source: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          income_date?: string
          payment_method?: string | null
          receipt_number?: string | null
          reference_id?: string | null
          reference_type?: string | null
          source: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          income_date?: string
          payment_method?: string | null
          receipt_number?: string | null
          reference_id?: string | null
          reference_type?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      issued_documents: {
        Row: {
          amount: number | null
          applicant_name: string
          applicant_phone: string | null
          beneficiary_name: string | null
          created_at: string
          document_category: string
          document_number: string | null
          document_type: string
          id: string
          issued_by: string | null
          issued_date: string
          member_id: string | null
          metadata: Json | null
          reference_id: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          applicant_name: string
          applicant_phone?: string | null
          beneficiary_name?: string | null
          created_at?: string
          document_category?: string
          document_number?: string | null
          document_type: string
          id?: string
          issued_by?: string | null
          issued_date?: string
          member_id?: string | null
          metadata?: Json | null
          reference_id: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          applicant_name?: string
          applicant_phone?: string | null
          beneficiary_name?: string | null
          created_at?: string
          document_category?: string
          document_number?: string | null
          document_type?: string
          id?: string
          issued_by?: string | null
          issued_date?: string
          member_id?: string | null
          metadata?: Json | null
          reference_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      landing_page_content: {
        Row: {
          content_key: string
          content_type: string
          content_value: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          language: string
          section: string
          updated_at: string
        }
        Insert: {
          content_key: string
          content_type?: string
          content_value: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          language?: string
          section: string
          updated_at?: string
        }
        Update: {
          content_key?: string
          content_type?: string
          content_value?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          language?: string
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      mahal_bookings: {
        Row: {
          admin_notes: string | null
          applicant_email: string | null
          applicant_name: string
          applicant_phone: string
          booking_amount: number | null
          created_at: string
          end_time: string
          event_date: string
          event_type: string
          expected_guests: number | null
          id: string
          payment_status: string | null
          special_requirements: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          applicant_email?: string | null
          applicant_name: string
          applicant_phone: string
          booking_amount?: number | null
          created_at?: string
          end_time: string
          event_date: string
          event_type: string
          expected_guests?: number | null
          id?: string
          payment_status?: string | null
          special_requirements?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          applicant_email?: string | null
          applicant_name?: string
          applicant_phone?: string
          booking_amount?: number | null
          created_at?: string
          end_time?: string
          event_date?: string
          event_type?: string
          expected_guests?: number | null
          id?: string
          payment_status?: string | null
          special_requirements?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      management_committee: {
        Row: {
          created_at: string
          end_date: string | null
          father_name: string | null
          id: string
          is_current: boolean | null
          name: string
          position: string
          qualification: string | null
          sort_order: number | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          father_name?: string | null
          id?: string
          is_current?: boolean | null
          name: string
          position: string
          qualification?: string | null
          sort_order?: number | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          father_name?: string | null
          id?: string
          is_current?: boolean | null
          name?: string
          position?: string
          qualification?: string | null
          sort_order?: number | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marriage_registers: {
        Row: {
          bride_address: string
          bride_age: number
          bride_category: string | null
          bride_father_name: string
          bride_father_name_en: string | null
          bride_madhab: string | null
          bride_name: string
          bride_name_en: string | null
          bride_photo_url: string | null
          created_at: string
          created_by: string | null
          day_name: string
          day_name_en: string | null
          day_night: string
          gregorian_day: number
          gregorian_month: string
          gregorian_year: number
          groom_address: string
          groom_age: number
          groom_category: string | null
          groom_father_name: string
          groom_father_name_en: string | null
          groom_madhab: string | null
          groom_name: string
          groom_name_en: string | null
          groom_photo_url: string | null
          hijri_day: number
          hijri_month: string
          hijri_year: number
          id: string
          kathib_name_en: string | null
          kathib_thaib_father_name: string | null
          kathib_thaib_name: string | null
          mahr: string
          mahr_en: string | null
          member_id: string | null
          place_of_marriage: string | null
          place_of_marriage_en: string | null
          register_page_number: string | null
          registrar_father_name: string
          registrar_name: string
          time_of_event: string
          updated_at: string
          wali_father_name: string
          wali_name: string
          wali_name_en: string | null
          witness1_father_name: string
          witness1_father_name_en: string | null
          witness1_name: string
          witness1_name_en: string | null
          witness2_father_name: string
          witness2_father_name_en: string | null
          witness2_name: string
          witness2_name_en: string | null
        }
        Insert: {
          bride_address: string
          bride_age: number
          bride_category?: string | null
          bride_father_name: string
          bride_father_name_en?: string | null
          bride_madhab?: string | null
          bride_name: string
          bride_name_en?: string | null
          bride_photo_url?: string | null
          created_at?: string
          created_by?: string | null
          day_name: string
          day_name_en?: string | null
          day_night: string
          gregorian_day: number
          gregorian_month: string
          gregorian_year: number
          groom_address: string
          groom_age: number
          groom_category?: string | null
          groom_father_name: string
          groom_father_name_en?: string | null
          groom_madhab?: string | null
          groom_name: string
          groom_name_en?: string | null
          groom_photo_url?: string | null
          hijri_day: number
          hijri_month: string
          hijri_year: number
          id?: string
          kathib_name_en?: string | null
          kathib_thaib_father_name?: string | null
          kathib_thaib_name?: string | null
          mahr: string
          mahr_en?: string | null
          member_id?: string | null
          place_of_marriage?: string | null
          place_of_marriage_en?: string | null
          register_page_number?: string | null
          registrar_father_name: string
          registrar_name: string
          time_of_event: string
          updated_at?: string
          wali_father_name: string
          wali_name: string
          wali_name_en?: string | null
          witness1_father_name: string
          witness1_father_name_en?: string | null
          witness1_name: string
          witness1_name_en?: string | null
          witness2_father_name: string
          witness2_father_name_en?: string | null
          witness2_name: string
          witness2_name_en?: string | null
        }
        Update: {
          bride_address?: string
          bride_age?: number
          bride_category?: string | null
          bride_father_name?: string
          bride_father_name_en?: string | null
          bride_madhab?: string | null
          bride_name?: string
          bride_name_en?: string | null
          bride_photo_url?: string | null
          created_at?: string
          created_by?: string | null
          day_name?: string
          day_name_en?: string | null
          day_night?: string
          gregorian_day?: number
          gregorian_month?: string
          gregorian_year?: number
          groom_address?: string
          groom_age?: number
          groom_category?: string | null
          groom_father_name?: string
          groom_father_name_en?: string | null
          groom_madhab?: string | null
          groom_name?: string
          groom_name_en?: string | null
          groom_photo_url?: string | null
          hijri_day?: number
          hijri_month?: string
          hijri_year?: number
          id?: string
          kathib_name_en?: string | null
          kathib_thaib_father_name?: string | null
          kathib_thaib_name?: string | null
          mahr?: string
          mahr_en?: string | null
          member_id?: string | null
          place_of_marriage?: string | null
          place_of_marriage_en?: string | null
          register_page_number?: string | null
          registrar_father_name?: string
          registrar_name?: string
          time_of_event?: string
          updated_at?: string
          wali_father_name?: string
          wali_name?: string
          wali_name_en?: string | null
          witness1_father_name?: string
          witness1_father_name_en?: string | null
          witness1_name?: string
          witness1_name_en?: string | null
          witness2_father_name?: string
          witness2_father_name_en?: string | null
          witness2_name?: string
          witness2_name_en?: string | null
        }
        Relationships: []
      }
      noc_certificates: {
        Row: {
          address_to_submit: string
          admin_notes: string | null
          applicant_email: string | null
          applicant_membership_number: string | null
          applicant_name: string
          applicant_phone: string | null
          applicant_relationship: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          family_name: string
          father_membership_number: string
          father_name: string
          id: string
          mosque_to_submit: string
          partner_applicant_relationship: string | null
          partner_category: string
          partner_father_name: string
          partner_name: string
          payment_status: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_to_submit: string
          admin_notes?: string | null
          applicant_email?: string | null
          applicant_membership_number?: string | null
          applicant_name: string
          applicant_phone?: string | null
          applicant_relationship: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          family_name: string
          father_membership_number: string
          father_name: string
          id?: string
          mosque_to_submit: string
          partner_applicant_relationship?: string | null
          partner_category: string
          partner_father_name: string
          partner_name: string
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_to_submit?: string
          admin_notes?: string | null
          applicant_email?: string | null
          applicant_membership_number?: string | null
          applicant_name?: string
          applicant_phone?: string | null
          applicant_relationship?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          family_name?: string
          father_membership_number?: string
          father_name?: string
          id?: string
          mosque_to_submit?: string
          partner_applicant_relationship?: string | null
          partner_category?: string
          partner_father_name?: string
          partner_name?: string
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      outside_marriage_registers: {
        Row: {
          bride_address: string
          bride_age: number
          bride_category: string | null
          bride_father_name: string
          bride_father_name_en: string | null
          bride_madhab: string | null
          bride_name: string
          bride_name_en: string | null
          bride_photo_url: string | null
          created_at: string
          created_by: string | null
          day_name: string
          day_name_en: string | null
          day_night: string
          gregorian_day: number
          gregorian_month: string
          gregorian_year: number
          groom_address: string
          groom_age: number
          groom_category: string | null
          groom_father_name: string
          groom_father_name_en: string | null
          groom_madhab: string | null
          groom_name: string
          groom_name_en: string | null
          groom_photo_url: string | null
          hijri_day: number
          hijri_month: string
          hijri_year: number
          id: string
          kathib_name_en: string | null
          kathib_thaib_father_name: string | null
          kathib_thaib_name: string | null
          mahr: string
          mahr_en: string | null
          member_id: string | null
          place_of_marriage: string | null
          place_of_marriage_en: string | null
          register_page_number: string | null
          registrar_father_name: string
          registrar_name: string
          time_of_event: string
          updated_at: string
          wali_father_name: string
          wali_name: string
          wali_name_en: string | null
          witness1_father_name: string
          witness1_father_name_en: string | null
          witness1_name: string
          witness1_name_en: string | null
          witness2_father_name: string
          witness2_father_name_en: string | null
          witness2_name: string
          witness2_name_en: string | null
        }
        Insert: {
          bride_address: string
          bride_age: number
          bride_category?: string | null
          bride_father_name: string
          bride_father_name_en?: string | null
          bride_madhab?: string | null
          bride_name: string
          bride_name_en?: string | null
          bride_photo_url?: string | null
          created_at?: string
          created_by?: string | null
          day_name: string
          day_name_en?: string | null
          day_night: string
          gregorian_day: number
          gregorian_month: string
          gregorian_year: number
          groom_address: string
          groom_age: number
          groom_category?: string | null
          groom_father_name: string
          groom_father_name_en?: string | null
          groom_madhab?: string | null
          groom_name: string
          groom_name_en?: string | null
          groom_photo_url?: string | null
          hijri_day: number
          hijri_month: string
          hijri_year: number
          id?: string
          kathib_name_en?: string | null
          kathib_thaib_father_name?: string | null
          kathib_thaib_name?: string | null
          mahr: string
          mahr_en?: string | null
          member_id?: string | null
          place_of_marriage?: string | null
          place_of_marriage_en?: string | null
          register_page_number?: string | null
          registrar_father_name: string
          registrar_name: string
          time_of_event: string
          updated_at?: string
          wali_father_name: string
          wali_name: string
          wali_name_en?: string | null
          witness1_father_name: string
          witness1_father_name_en?: string | null
          witness1_name: string
          witness1_name_en?: string | null
          witness2_father_name: string
          witness2_father_name_en?: string | null
          witness2_name: string
          witness2_name_en?: string | null
        }
        Update: {
          bride_address?: string
          bride_age?: number
          bride_category?: string | null
          bride_father_name?: string
          bride_father_name_en?: string | null
          bride_madhab?: string | null
          bride_name?: string
          bride_name_en?: string | null
          bride_photo_url?: string | null
          created_at?: string
          created_by?: string | null
          day_name?: string
          day_name_en?: string | null
          day_night?: string
          gregorian_day?: number
          gregorian_month?: string
          gregorian_year?: number
          groom_address?: string
          groom_age?: number
          groom_category?: string | null
          groom_father_name?: string
          groom_father_name_en?: string | null
          groom_madhab?: string | null
          groom_name?: string
          groom_name_en?: string | null
          groom_photo_url?: string | null
          hijri_day?: number
          hijri_month?: string
          hijri_year?: number
          id?: string
          kathib_name_en?: string | null
          kathib_thaib_father_name?: string | null
          kathib_thaib_name?: string | null
          mahr?: string
          mahr_en?: string | null
          member_id?: string | null
          place_of_marriage?: string | null
          place_of_marriage_en?: string | null
          register_page_number?: string | null
          registrar_father_name?: string
          registrar_name?: string
          time_of_event?: string
          updated_at?: string
          wali_father_name?: string
          wali_name?: string
          wali_name_en?: string | null
          witness1_father_name?: string
          witness1_father_name_en?: string | null
          witness1_name?: string
          witness1_name_en?: string | null
          witness2_father_name?: string
          witness2_father_name_en?: string | null
          witness2_name?: string
          witness2_name_en?: string | null
        }
        Relationships: []
      }
      page_visits: {
        Row: {
          created_at: string
          id: string
          page_path: string
          user_agent: string | null
          visited_at: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_path?: string
          user_agent?: string | null
          visited_at?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_path?: string
          user_agent?: string | null
          visited_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          member_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          member_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          member_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      pending_users: {
        Row: {
          admin_notes: string | null
          created_at: string
          full_name: string
          id: string
          member_id: string
          password_hash: string | null
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          full_name: string
          id?: string
          member_id: string
          password_hash?: string | null
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          full_name?: string
          id?: string
          member_id?: string
          password_hash?: string | null
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          notification_email: boolean | null
          notification_sms: boolean | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          notification_email?: boolean | null
          notification_sms?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          notification_email?: boolean | null
          notification_sms?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quran_bookmarks: {
        Row: {
          arabic_text: string
          audio_url: string | null
          ayah_number: number
          created_at: string
          english_text: string
          id: string
          surah_name: string
          surah_number: number
          user_id: string
          verse_number: number
        }
        Insert: {
          arabic_text: string
          audio_url?: string | null
          ayah_number: number
          created_at?: string
          english_text: string
          id?: string
          surah_name: string
          surah_number: number
          user_id: string
          verse_number: number
        }
        Update: {
          arabic_text?: string
          audio_url?: string | null
          ayah_number?: number
          created_at?: string
          english_text?: string
          id?: string
          surah_name?: string
          surah_number?: number
          user_id?: string
          verse_number?: number
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          bank_account_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          booking_id: string
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          status: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          booking_id: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          status?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          status?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "mahal_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_slots: {
        Row: {
          amount: number | null
          created_at: string
          created_by: string | null
          id: string
          is_paid: boolean
          member_id: string
          month: number
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          transaction_id: string | null
          updated_at: string
          year: number
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_paid?: boolean
          member_id: string
          month: number
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          transaction_id?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_paid?: boolean
          member_id?: string
          month?: number
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          transaction_id?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          from_month: number | null
          from_year: number | null
          id: string
          member_address: string | null
          member_id: string
          member_name: string
          member_phone: string
          number_of_months: number | null
          payment_method: string | null
          payment_status: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          subscription_type: string
          subscription_year: number | null
          to_month: number | null
          to_year: number | null
          total_amount: number
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          from_month?: number | null
          from_year?: number | null
          id?: string
          member_address?: string | null
          member_id: string
          member_name: string
          member_phone: string
          number_of_months?: number | null
          payment_method?: string | null
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          subscription_type: string
          subscription_year?: number | null
          to_month?: number | null
          to_year?: number | null
          total_amount: number
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          from_month?: number | null
          from_year?: number | null
          id?: string
          member_address?: string | null
          member_id?: string
          member_name?: string
          member_phone?: string
          number_of_months?: number | null
          payment_method?: string | null
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          subscription_type?: string
          subscription_year?: number | null
          to_month?: number | null
          to_year?: number | null
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      visitor_stats: {
        Row: {
          today_visitors: number | null
          total_visitors: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_mahal_booking_conflict: {
        Args: { _event_date: string }
        Returns: {
          has_approved: boolean
          has_conflict: boolean
          has_pending: boolean
        }[]
      }
      cleanup_expired_otp_tokens: { Args: never; Returns: undefined }
      create_mahal_booking: {
        Args: {
          _applicant_email: string
          _applicant_name: string
          _applicant_phone: string
          _booking_amount: number
          _end_time: string
          _event_date: string
          _event_type: string
          _expected_guests: number
          _special_requirements: string
          _start_time: string
        }
        Returns: string
      }
      create_mahal_booking_admin_override: {
        Args: {
          _applicant_email?: string
          _applicant_name: string
          _applicant_phone: string
          _booking_amount?: number
          _end_time?: string
          _event_date?: string
          _event_type?: string
          _expected_guests?: number
          _special_requirements?: string
          _start_time?: string
        }
        Returns: string
      }
      generate_document_number_for_type: {
        Args: { p_document_type: string }
        Returns: string
      }
      get_mahal_availability: {
        Args: { _end: string; _start: string }
        Returns: {
          event_date: string
          event_type: string
          status: Database["public"]["Enums"]["booking_status"]
        }[]
      }
      get_non_admin_gb_members: {
        Args: never
        Returns: {
          address: string | null
          auth_user_id: string | null
          blood_group: Database["public"]["Enums"]["blood_group"] | null
          created_at: string
          date_of_birth: string | null
          date_of_marriage: string
          email: string | null
          family_name: string | null
          father_name: string
          full_name: string
          id: string
          is_active: boolean | null
          joined_at: string | null
          member_id: string
          occupation: string | null
          phone: string | null
          photo_url: string | null
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "gb_members"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member" | "user" | "superadmin"
      blood_group: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"
      booking_status: "pending" | "approved" | "rejected" | "cancelled"
      event_status: "upcoming" | "ongoing" | "completed" | "cancelled"
      family_relationship: "கணவன்" | "மனைவி" | "மகன்" | "மகள்"
      grievance_status: "pending" | "in_progress" | "resolved" | "closed"
      marital_status:
        | "திருமணமாகாதவர்"
        | "திருமணமானவர்"
        | "விவாகரத்தானவர்"
        | "விதவை/விதுரர்"
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
      app_role: ["admin", "member", "user", "superadmin"],
      blood_group: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      booking_status: ["pending", "approved", "rejected", "cancelled"],
      event_status: ["upcoming", "ongoing", "completed", "cancelled"],
      family_relationship: ["கணவன்", "மனைவி", "மகன்", "மகள்"],
      grievance_status: ["pending", "in_progress", "resolved", "closed"],
      marital_status: [
        "திருமணமாகாதவர்",
        "திருமணமானவர்",
        "விவாகரத்தானவர்",
        "விதவை/விதுரர்",
      ],
    },
  },
} as const
