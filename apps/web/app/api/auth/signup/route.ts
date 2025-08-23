import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';
import { withErrorHandler, jsonResponse } from '@/app/api/error-handler';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { email, password, name } = await req.json();

  if (!email || !password || !name) {
    return jsonResponse(
      { 
        ok: false,
        error: { 
          code: "MISSING_FIELDS",
          message: "Please provide all required fields" 
        }
      },
      400
    );
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    return jsonResponse(
      { 
        ok: false,
        error: { 
          code: "USER_EXISTS",
          message: "A user with this email already exists" 
        }
      },
      400
    );
  }

  // Hash password
  const hashedPassword = await hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
    },
  });

  return jsonResponse({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  });
});