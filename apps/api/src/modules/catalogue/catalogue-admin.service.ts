import { BadRequestException, Injectable } from '@nestjs/common';
import { AddOnInput, FlavourInput, PlanInput, planCreateSchema } from '@way2meal/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { audited } from '../audit/audited';

/**
 * Admin CRUD for plans, add-ons and flavours. There is no hard delete: these
 * rows are referenced by subscriptions, orders and deliveries, so the admin
 * deactivates them instead (`active: false`).
 */
@Injectable()
export class CatalogueAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Plans ──
  listPlans() {
    return this.prisma.plan.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  createPlan(input: PlanInput, actorId: string) {
    return audited(
      this.prisma,
      this.audit,
      { actorId, action: 'plan.create', entity: 'Plan' },
      async (tx) => {
        const after = await tx.plan.create({ data: input });
        return { entityId: after.id, after };
      },
    );
  }

  /** Plan terms are snapshotted onto subscriptions, so edits only affect future purchases. */
  updatePlan(id: string, input: Partial<PlanInput>, actorId: string) {
    return audited(
      this.prisma,
      this.audit,
      { actorId, action: 'plan.update', entity: 'Plan' },
      async (tx) => {
        const before = await tx.plan.findUniqueOrThrow({ where: { id } });
        const merged = planCreateSchema.safeParse({ ...before, ...input });
        if (!merged.success) {
          throw new BadRequestException({ message: 'Invalid plan', errors: merged.error.issues });
        }
        const after = await tx.plan.update({ where: { id }, data: input });
        return { entityId: id, before, after };
      },
    );
  }

  // ── Add-ons ──
  listAddOns() {
    return this.prisma.addOn.findMany({ orderBy: { name: 'asc' } });
  }

  createAddOn(input: AddOnInput, actorId: string) {
    return audited(
      this.prisma,
      this.audit,
      { actorId, action: 'addOn.create', entity: 'AddOn' },
      async (tx) => {
        const after = await tx.addOn.create({ data: input });
        return { entityId: after.id, after };
      },
    );
  }

  updateAddOn(id: string, input: Partial<AddOnInput>, actorId: string) {
    return audited(
      this.prisma,
      this.audit,
      { actorId, action: 'addOn.update', entity: 'AddOn' },
      async (tx) => {
        const before = await tx.addOn.findUniqueOrThrow({ where: { id } });
        const after = await tx.addOn.update({ where: { id }, data: input });
        return { entityId: id, before, after };
      },
    );
  }

  // ── Flavours ──
  listFlavours() {
    return this.prisma.flavour.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  createFlavour(input: FlavourInput, actorId: string) {
    return audited(
      this.prisma,
      this.audit,
      { actorId, action: 'flavour.create', entity: 'Flavour' },
      async (tx) => {
        const after = await tx.flavour.create({ data: input });
        return { entityId: after.id, after };
      },
    );
  }

  updateFlavour(id: string, input: Partial<FlavourInput>, actorId: string) {
    return audited(
      this.prisma,
      this.audit,
      { actorId, action: 'flavour.update', entity: 'Flavour' },
      async (tx) => {
        const before = await tx.flavour.findUniqueOrThrow({ where: { id } });
        const after = await tx.flavour.update({ where: { id }, data: input });
        return { entityId: id, before, after };
      },
    );
  }
}
