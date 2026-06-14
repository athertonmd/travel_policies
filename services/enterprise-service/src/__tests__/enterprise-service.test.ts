import { describe, it, expect, beforeEach } from 'vitest';
import { EnterpriseService } from '../services/enterprise-service';
import { TenantService } from '../services/tenant-service';
import { InMemoryTenantRepository } from '../repositories/in-memory/in-memory-tenant-repository';
import { InMemoryEnterpriseRepository } from '../repositories/in-memory/in-memory-enterprise-repository';
import { InMemoryAuditRepository } from '../repositories/in-memory/in-memory-audit-repository';
import { InMemoryEventBus } from '../events/event-bus';
import { CallerContext, TenantEntity } from '../domain/types';

describe('EnterpriseService', () => {
  let tenantRepo: InMemoryTenantRepository;
  let enterpriseRepo: InMemoryEnterpriseRepository;
  let auditRepo: InMemoryAuditRepository;
  let eventBus: InMemoryEventBus;
  let enterpriseService: EnterpriseService;
  let tenantService: TenantService;
  let tenantA: TenantEntity;
  let tenantB: TenantEntity;

  const systemAdmin: CallerContext = {
    user_id: '550e8400-e29b-41d4-a716-446655440001',
    tenant_id: '550e8400-e29b-41d4-a716-446655440000',
    role: 'SystemAdmin',
  };

  beforeEach(async () => {
    tenantRepo = new InMemoryTenantRepository();
    enterpriseRepo = new InMemoryEnterpriseRepository();
    auditRepo = new InMemoryAuditRepository();
    eventBus = new InMemoryEventBus();
    tenantService = new TenantService(tenantRepo, auditRepo, eventBus);
    enterpriseService = new EnterpriseService(tenantRepo, enterpriseRepo, auditRepo, eventBus);

    // Create two tenants for testing tenant isolation
    tenantA = await tenantService.createTenant({ name: 'TMC Alpha' }, systemAdmin);
    tenantB = await tenantService.createTenant({ name: 'TMC Beta' }, systemAdmin);
  });

  const tmcAdminA = (): CallerContext => ({
    user_id: '550e8400-e29b-41d4-a716-446655440010',
    tenant_id: tenantA.tenant_id,
    role: 'TMCAdmin',
  });

  const tmcAdminB = (): CallerContext => ({
    user_id: '550e8400-e29b-41d4-a716-446655440020',
    tenant_id: tenantB.tenant_id,
    role: 'TMCAdmin',
  });

  describe('createEnterprise', () => {
    it('should create an enterprise with Active status', async () => {
      const result = await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Acme Corp', country: 'United Kingdom' },
        tmcAdminA(),
      );
      expect(result.name).toBe('Acme Corp');
      expect(result.country).toBe('United Kingdom');
      expect(result.status).toBe('Active');
      expect(result.tenant_id).toBe(tenantA.tenant_id);
      expect(result.version).toBe(1);
    });

    it('should emit EnterpriseCreated event', async () => {
      await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Event Corp', country: 'US' },
        tmcAdminA(),
      );
      const events = eventBus.getEventsByType('EnterpriseCreated');
      expect(events).toHaveLength(1);
    });

    it('should create audit record', async () => {
      const result = await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Audit Corp', country: 'US' },
        tmcAdminA(),
      );
      const audits = await auditRepo.findByEntity('Enterprise', result.enterprise_id);
      expect(audits).toHaveLength(1);
      expect(audits[0].action).toBe('EnterpriseCreated');
    });

    it('should reject creation with non-existent tenant', async () => {
      await expect(
        enterpriseService.createEnterprise(
          '550e8400-e29b-41d4-a716-446655440099',
          { name: 'Ghost Corp', country: 'US' },
          systemAdmin,
        ),
      ).rejects.toThrow('Tenant not found');
    });

    it('should reject empty enterprise name', async () => {
      await expect(
        enterpriseService.createEnterprise(
          tenantA.tenant_id,
          { name: '', country: 'US' },
          tmcAdminA(),
        ),
      ).rejects.toThrow('Invalid enterprise data');
    });
  });

  describe('getEnterprise', () => {
    it('should retrieve an enterprise by ID', async () => {
      const created = await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Retrieve Corp', country: 'FR' },
        tmcAdminA(),
      );
      const found = await enterpriseService.getEnterprise(
        tenantA.tenant_id,
        created.enterprise_id,
        tmcAdminA(),
      );
      expect(found.name).toBe('Retrieve Corp');
    });

    it('should throw NotFoundError for unknown enterprise', async () => {
      await expect(
        enterpriseService.getEnterprise(
          tenantA.tenant_id,
          '550e8400-e29b-41d4-a716-446655440099',
          tmcAdminA(),
        ),
      ).rejects.toThrow('Enterprise not found');
    });
  });

  describe('listEnterprises', () => {
    it('should list enterprises for a specific tenant', async () => {
      await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Corp 1', country: 'UK' },
        tmcAdminA(),
      );
      await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Corp 2', country: 'UK' },
        tmcAdminA(),
      );
      await enterpriseService.createEnterprise(
        tenantB.tenant_id,
        { name: 'Corp 3', country: 'DE' },
        tmcAdminB(),
      );

      const listA = await enterpriseService.listEnterprises(tenantA.tenant_id, tmcAdminA());
      expect(listA).toHaveLength(2);

      const listB = await enterpriseService.listEnterprises(tenantB.tenant_id, tmcAdminB());
      expect(listB).toHaveLength(1);
    });
  });

  describe('updateEnterprise', () => {
    it('should update enterprise name', async () => {
      const created = await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Old Corp', country: 'UK' },
        tmcAdminA(),
      );
      const updated = await enterpriseService.updateEnterprise(
        tenantA.tenant_id,
        created.enterprise_id,
        { name: 'New Corp' },
        tmcAdminA(),
      );
      expect(updated.name).toBe('New Corp');
      expect(updated.version).toBe(2);
    });

    it('should emit EnterpriseUpdated event', async () => {
      const created = await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Update Event', country: 'UK' },
        tmcAdminA(),
      );
      await enterpriseService.updateEnterprise(
        tenantA.tenant_id,
        created.enterprise_id,
        { name: 'Updated' },
        tmcAdminA(),
      );
      const events = eventBus.getEventsByType('EnterpriseUpdated');
      expect(events).toHaveLength(1);
    });

    it('should create audit record on update', async () => {
      const created = await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Audit Update', country: 'UK' },
        tmcAdminA(),
      );
      await enterpriseService.updateEnterprise(
        tenantA.tenant_id,
        created.enterprise_id,
        { country: 'US' },
        tmcAdminA(),
      );
      const audits = await auditRepo.findByEntity('Enterprise', created.enterprise_id);
      expect(audits.some((a) => a.action === 'EnterpriseUpdated')).toBe(true);
    });
  });

  describe('archiveEnterprise', () => {
    it('should set status to Archived (soft delete)', async () => {
      const created = await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Archive Corp', country: 'UK' },
        tmcAdminA(),
      );
      const archived = await enterpriseService.archiveEnterprise(
        tenantA.tenant_id,
        created.enterprise_id,
        tmcAdminA(),
      );
      expect(archived.status).toBe('Archived');
      expect(archived.version).toBe(2);
    });

    it('should emit EnterpriseArchived event', async () => {
      const created = await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Archive Event', country: 'UK' },
        tmcAdminA(),
      );
      await enterpriseService.archiveEnterprise(
        tenantA.tenant_id,
        created.enterprise_id,
        tmcAdminA(),
      );
      const events = eventBus.getEventsByType('EnterpriseArchived');
      expect(events).toHaveLength(1);
    });

    it('should create audit record on archive', async () => {
      const created = await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Audit Archive', country: 'UK' },
        tmcAdminA(),
      );
      await enterpriseService.archiveEnterprise(
        tenantA.tenant_id,
        created.enterprise_id,
        tmcAdminA(),
      );
      const audits = await auditRepo.findByEntity('Enterprise', created.enterprise_id);
      expect(audits.some((a) => a.action === 'EnterpriseArchived')).toBe(true);
    });
  });

  describe('Multi-tenant isolation (BR-042, ADR-020)', () => {
    it('should prevent TMCAdmin from accessing enterprises of another tenant', async () => {
      const enterprise = await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Isolated Corp', country: 'UK' },
        tmcAdminA(),
      );

      // TMCAdmin from tenant B trying to access tenant A's enterprise
      await expect(
        enterpriseService.getEnterprise(tenantA.tenant_id, enterprise.enterprise_id, tmcAdminB()),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should prevent TMCAdmin from listing enterprises of another tenant', async () => {
      await expect(
        enterpriseService.listEnterprises(tenantA.tenant_id, tmcAdminB()),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should prevent TMCAdmin from creating enterprises in another tenant', async () => {
      await expect(
        enterpriseService.createEnterprise(
          tenantA.tenant_id,
          { name: 'Intruder', country: 'US' },
          tmcAdminB(),
        ),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should prevent TMCAdmin from updating enterprises of another tenant', async () => {
      const enterprise = await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Protected Corp', country: 'UK' },
        tmcAdminA(),
      );
      await expect(
        enterpriseService.updateEnterprise(
          tenantA.tenant_id,
          enterprise.enterprise_id,
          { name: 'Hacked' },
          tmcAdminB(),
        ),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should prevent TMCAdmin from archiving enterprises of another tenant', async () => {
      const enterprise = await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Cannot Archive', country: 'UK' },
        tmcAdminA(),
      );
      await expect(
        enterpriseService.archiveEnterprise(
          tenantA.tenant_id,
          enterprise.enterprise_id,
          tmcAdminB(),
        ),
      ).rejects.toThrow('Cross-tenant access denied');
    });

    it('should allow SystemAdmin to access enterprises of any tenant', async () => {
      const enterprise = await enterpriseService.createEnterprise(
        tenantA.tenant_id,
        { name: 'Admin Access Corp', country: 'UK' },
        tmcAdminA(),
      );
      const found = await enterpriseService.getEnterprise(
        tenantA.tenant_id,
        enterprise.enterprise_id,
        systemAdmin,
      );
      expect(found.name).toBe('Admin Access Corp');
    });

    it('should allow SystemAdmin to list enterprises of any tenant', async () => {
      await enterpriseService.createEnterprise(
        tenantB.tenant_id,
        { name: 'Admin List Corp', country: 'DE' },
        tmcAdminB(),
      );
      const list = await enterpriseService.listEnterprises(tenantB.tenant_id, systemAdmin);
      expect(list).toHaveLength(1);
    });
  });
});
