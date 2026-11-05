import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/auth/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async me(@CurrentUser() user: AuthUser) {
    const found = await this.prisma.user.findFirst({
      where: { id: user.id, deletedAt: null },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        dietaryNote: true,
        defaultFlavourId: true,
        addresses: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!found) throw new NotFoundException('Account not found');
    return found;
  }
}
