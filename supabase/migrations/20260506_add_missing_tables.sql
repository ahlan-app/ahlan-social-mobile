-- Copyright 2026 Samet Yilmaz Temel
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
--     http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.

-- Migration: Add missing tables for Ahlan Social
-- Created: 2026-05-06

-- ═══════════════════════════════════════
-- reports table — user/post reporting
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('user', 'post', 'comment', 'story')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id)
);

-- RLS: users can create reports, admins can read
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY Users can create reports
    ON public.reports FOR INSERT
    TO authenticated
    WITH CHECK (reporter_id = auth.uid());

CREATE POLICY Users can view their own reports
    ON public.reports FOR SELECT
    TO authenticated
    USING (reporter_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);

-- ═══════════════════════════════════════
-- push_tokens table — Expo push notifications
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: users manage their own tokens
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY Users can insert own tokens
    ON public.push_tokens FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY Users can view own tokens
    ON public.push_tokens FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY Users can update own tokens
    ON public.push_tokens FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY Users can delete own tokens
    ON public.push_tokens FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens(user_id);
