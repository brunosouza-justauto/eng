-- Migration for food database enhancement

-- Add new columns to food_items table
ALTER TABLE public.food_items
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ausnut' CHECK (source IN ('ausnut', 'usda', 'open_food_facts', 'custom')),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Create index on barcode for fast lookups
CREATE INDEX IF NOT EXISTS idx_food_items_barcode ON public.food_items(barcode);
CREATE INDEX IF NOT EXISTS idx_food_items_source ON public.food_items(source);
CREATE INDEX IF NOT EXISTS idx_food_items_created_by ON public.food_items(created_by);

-- Update RLS policies to allow users to create food items
CREATE POLICY "Users can create food items"
ON public.food_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to see all food items
CREATE POLICY "Users can view all food items"
ON public.food_items FOR SELECT
TO authenticated
USING (true);

-- Update RLS policy so users can only update their own custom food items
CREATE POLICY "Users can update their own custom food items"
ON public.food_items FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Create a table to store food item image URLs
CREATE TABLE IF NOT EXISTS public.food_item_images (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    food_item_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Create policies for food item images
CREATE POLICY "Users can view food item images"
ON public.food_item_images FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can add images to food items"
ON public.food_item_images FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own food item images"
ON public.food_item_images FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Enable RLS on the new tables
ALTER TABLE public.food_item_images ENABLE ROW LEVEL SECURITY; 