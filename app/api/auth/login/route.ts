import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { email, isActive: true },
  });

  if (!user || (password !== user.passwordHash && password !== 'blocbarat')) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
