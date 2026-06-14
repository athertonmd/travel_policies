import { describe, it, expect, beforeEach } from 'vitest';
import { TenantService } from '../services/tenant-service';
import { InMemoryTenantRepository } from '../repositories/in-memory/in-memory-tenant-repository';
import { InMemoryAuditRepository } from '../repositories/in-memory/in-memory-audit-repository';
import { InMemoryEventBus } from '../events/event-bus';
import { CallerContext } from '../domain/types';

describe('TenantService', () => {
  let tenantRepo: InMemoryTenantRepository;
  let auditRepo: InMemoryAuditRepository;
  let eventBus: InMemoryEventBus;
  let tenantService: TenantService;

  const systemAdmin: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    tenant_id: '550e8400-e29b-41d4-a716-446655440000',
    role: 'SystemAdmin',
  };

  const tmcAdmin: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440002',
    tenant_id: '550e8400-e29b-41d4-a716-446655440010',
    role: 'TMCAdmin',
  };

  beforeEach(() => {
    tenantRepo = new InMemoryTenantRepository();
    auditRepo = new InMemoryAuditRepository();
    eventBus = new InMemoryEventBus();
    tenantService = new TenantService(tenantRepo, auditRepo, eventBus);
  });

  describe('createTenant', () => {
    it('should create a tenant with Active status', async () => {
      const result = await tenantService.createTenant({ name: 'Acme Travel' }, systemAdmin);
      expect(result.name).toBe('Acme Travel');
      expect(result.status).toBe('Active');
      expect(result.version).toBe(1);
      expect(result.tenant_id).toBeDefined();
    });

    it('should emit TenantCreated event', async () => {
      await tenantService.createTenant({ name: 'Test TMC' }, systemAdmin);
      const events = eventBus.getEventsByType('TenantCreated');
      expect(events).toHaveLength(1);
    });

    it('should create an audit record', async () => {
      const result = await tenantService.createTenant({ name: 'Audit Test' }, systemAdmin);
      const audits = await auditRepo.findByEntity('Tenant', result.tenant_id);
      expect(audits).toHaveLength(1);
      expect(audits[0].action).toBe('TenantCreated');
    });

    it('should reject non-SystemAdmin callers', async () => {
      await expect(
        tenantService.createTenant({ name: 'Should Fail' }, tmcAdmin),
      ).rejects.toThrow('Only SystemAdmin can manage tenants');
    });

    it('should reject empty name', async () => {
      await expect(
        tenantService.createTenant({ name: '' }, systemAdmin),
      ).rejects.toThrow('Invalid tenant data');
    });
  });

  describe('getTenant', () => {
    it('should retrieve a tenant by ID', async () => {
      const created = await tenantService.createTenant({ name: 'Get Test' }, systemAdmin);
      const found = await tenantService.getTenant(created.tenant_id, systemAdmin);
      expect(found.name).toBe('Get Test');
    });

    it('should throw NotFoundError for unknown ID', async () => {
      await expect(
        tenantService.getTenant('550e8400-e29b-41d4-a716-446655440099', systemAdmin),
      ).rejects.toThrow('Tenant not found');
    });

    it('should allow TMCAdmin to access their own tenant', async () => {
      const created = await tenantService.createTenant({ name: 'Own Tenant' }, systemAdmin);
      const tmcCaller: CallerContext = { ...tmcAdmin, tenant_id: created.tenant_id };
      const found = await tenantService.getTenant(created.tenant_id, tmcCaller);
      expect(found.name).toBe('Own Tenant');
    });

    it('should deny TMCAdmin access to other tenants', async () => {
      const created = await tenantService.createTenant({ name: 'Other' }, systemAdmin);
      await expect(
        tenantService.getTenant(created.tenant_id, tmcAdmin),
      ).rejects.toThrow('Cross-tenant access denied');
    });
  });

  describe('listTenants', () => {
    it('should list all tenants for SystemAdmin', async () => {
      await tenantService.createTenant({ name: 'TMC A' }, systemAdmin);
      await tenantService.createTenant({ name: 'TMC B' }, systemAdmin);
      const list = await tenantService.listTenants(systemAdmin);
      expect(list).toHaveLength(2);
    });

    it('should deny non-SystemAdmin', async () => {
      await expect(tenantService.listTenants(tmcAdmin)).rejects.toThrow(
        'Only SystemAdmin can manage tenants',
      );
    });
  });

  describe('updateTenant', () => {
    it('should update tenant name', async () => {
      const created = await tenantService.createTenant({ name: 'Old Name' }, systemAdmin);
      const updated = await tenantService.updateTenant(
        created.tenant_id,
        { name: 'New Name' },
        systemAdmin,
      );
      expect(updated.name).toBe('New Name');
      expect(updated.version).toBe(2);
    });

    it('should emit TenantUpdated event', async () => {
      const created = await tenantService.createTenant({ name: 'Event Test' }, systemAdmin);
      await tenantService.updateTenant(created.tenant_id, { name: 'Updated' }, systemAdmin);
      const events = eventBus.getEventsByType('TenantUpdated');
      expect(events).toHaveLength(1);
    });

    it('should create audit record on update', async () => {
      const created = await tenantService.createTenant({ name: 'Audit Update' }, systemAdmin);
      await tenantService.updateTenant(created.tenant_id, { name: 'Changed' }, systemAdmin);
      const audits = await auditRepo.findByEntity('Tenant', created.tenant_id);
      expect(audits.some((a) => a.action === 'TenantUpdated')).toBe(true);
    });
  });

  describe('archiveTenant', () => {
    it('should set status to Archived (soft delete)', async () => {
      const created = await tenantService.createTenant({ name: 'To Archive' }, systemAdmin);
      const archived = await tenantService.archiveTenant(created.tenant_id, systemAdmin);
      expect(archived.status).toBe('Archived');
      expect(archived.version).toBe(2);
    });

    it('should emit TenantArchived event', async () => {
      const created = await tenantService.createTenant({ name: 'Archive Event' }, systemAdmin);
      await tenantService.archiveTenant(created.tenant_id, systemAdmin);
      const events = eventBus.getEventsByType('TenantArchived');
      expect(events).toHaveLength(1);
    });

    it('should create audit record on archive', async () => {
      const created = await tenantService.createTenant({ name: 'Audit Archive' }, systemAdmin);
      await tenantService.archiveTenant(created.tenant_id, systemAdmin);
      const audits = await auditRepo.findByEntity('Tenant', created.tenant_id);
      expect(audits.some((a) => a.action === 'TenantArchived')).toBe(true);
    });
  });
});
