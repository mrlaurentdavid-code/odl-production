-- Enable RLS on invitation_tokens table
ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can insert invitation tokens
CREATE POLICY "Super admins can insert invitations"
ON invitation_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
);

-- Policy: Super admins can view all invitations
CREATE POLICY "Super admins can view invitations"
ON invitation_tokens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
);

-- Policy: Super admins can update invitations
CREATE POLICY "Super admins can update invitations"
ON invitation_tokens
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
);

-- Policy: Super admins can delete invitations
CREATE POLICY "Super admins can delete invitations"
ON invitation_tokens
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
);
