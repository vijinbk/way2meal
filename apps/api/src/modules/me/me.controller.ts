import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { profileUpdateSchema } from '@way2meal/shared';
import { createZodDto } from 'nestjs-zod';
import { AuthUser, CurrentUser } from '../../common/auth/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';

class ProfileUpdateDto extends createZodDto(profileUpdateSchema) {}

const profileSelect = {
  id: true,
  phone: true,
  name: true,
  email: true,
  role: true,
  dietaryNote: true,
  defaultFlavourId: true,
  addresses: { orderBy: { createdAt: 'asc' } },
} as const;

@ApiTags('profile')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async me(@CurrentUser() user: AuthUser) {
    const found = await this.prisma.user.findFirst({
      where: { id: user.id, deletedAt: null },
      select: profileSelect,
    });
    if (!found) throw new NotFoundException('Account not found');
    return found;
  }

  /** Onboarding and profile edits. */
  @Patch()
  async update(@CurrentUser() user: AuthUser, @Body() body: ProfileUpdateDto) {
    if (body.defaultFlavourId) {
      const flavour = await this.prisma.flavour.findFirst({
        where: { id: body.defaultFlavourId, active: true },
      });
      if (!flavour) throw new BadRequestException('Unknown flavour');
    }
    // Unknown fields (e.g. role) are stripped by the schema, so the body may be empty.
    if (Object.keys(body).length > 0) {
      await this.prisma.user.updateMany({ where: { id: user.id, deletedAt: null }, data: body });
    }
    return this.me(user);
  }
}
