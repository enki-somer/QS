-- ====================================
-- ADD INVOICE ATTACHMENTS & FRAUD PREVENTION FIELDS
-- ====================================
-- This script adds support for invoice attachments and customer invoice number tracking
-- to prevent fraud by checking duplicate customer invoice numbers

-- Add new columns to invoices table
ALTER TABLE invoices 
ADD COLUMN customer_invoice_number VARCHAR(100),
ADD COLUMN attachment_data TEXT, -- Base64 encoded compressed image
ADD COLUMN attachment_filename VARCHAR(255),
ADD COLUMN attachment_size INTEGER, -- Size in bytes for tracking
ADD COLUMN attachment_type VARCHAR(50); -- MIME type (image/jpeg, image/png, etc.)

-- Create index for customer invoice number to enable fast duplicate checking
CREATE INDEX idx_invoices_customer_number ON invoices(customer_invoice_number);

-- Add constraint to prevent duplicate customer invoice numbers (fraud prevention)
-- Note: We allow NULL values since not all invoices may have customer numbers
CREATE UNIQUE INDEX idx_invoices_customer_number_unique 
ON invoices(customer_invoice_number) 
WHERE customer_invoice_number IS NOT NULL AND customer_invoice_number != '';

-- Add comments for documentation
COMMENT ON COLUMN invoices.customer_invoice_number IS 'Customer handwritten invoice number for tracking and fraud prevention';
COMMENT ON COLUMN invoices.attachment_data IS 'Base64 encoded compressed image data of customer invoice';
COMMENT ON COLUMN invoices.attachment_filename IS 'Original filename of the uploaded attachment';
COMMENT ON COLUMN invoices.attachment_size IS 'Size of attachment in bytes for storage tracking';
COMMENT ON COLUMN invoices.attachment_type IS 'MIME type of the attachment (image/jpeg, image/png, etc.)';
