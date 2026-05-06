/**
 * In-memory `DataSource` backed by `mockStore.ts`. Supports full CRUD so the
 * UI works end-to-end without any external system.
 */

import { nextId, store } from '../mockStore';
import type {
  BusinessProfile,
  Campaign,
  ContentItem,
  Experiment,
  KeywordCluster,
  LifecycleFlow,
  PlanItem,
  SeoPage,
} from '../../types';
import type {
  DataSource,
  DataSourceStatus,
  IntakeResponses,
  KpiCategory,
} from './types';

function collectionOps<T extends { id: string }>(list: T[], prefix: string) {
  return {
    list: () => Promise.resolve(list.slice()),
    create: (input: Omit<T, 'id'>) => {
      const item = { ...(input as object), id: nextId(prefix) } as T;
      list.push(item);
      return Promise.resolve(item);
    },
    update: (id: string, patch: Partial<T>) => {
      const idx = list.findIndex((x) => x.id === id);
      if (idx === -1) return Promise.resolve(null);
      list[idx] = { ...list[idx], ...patch, id: list[idx].id } as T;
      return Promise.resolve(list[idx]);
    },
    remove: (id: string) => {
      const idx = list.findIndex((x) => x.id === id);
      if (idx === -1) return Promise.resolve(false);
      list.splice(idx, 1);
      return Promise.resolve(true);
    },
  };
}

export class MockDataSource implements DataSource {
  readonly status: DataSourceStatus = {
    kind: 'mock',
    label: 'Mock data',
    detail: 'In-memory seed data (resets on server restart)',
  };

  private campaigns = collectionOps<Campaign>(store.campaigns, 'cmp');
  private experiments = collectionOps<Experiment>(store.experiments, 'exp');
  private contentItems = collectionOps<ContentItem>(store.contentItems, 'ci');
  private seoPages = collectionOps<SeoPage>(store.seoPages, 'sp');
  private keywordClusters = collectionOps<KeywordCluster>(store.keywordClusters, 'kc');
  private lifecycleFlows = collectionOps<LifecycleFlow>(store.lifecycleFlows, 'lf');
  private planItems = collectionOps<PlanItem>(store.planItems, 'pi');

  // Reads ---------------------------------------------------------------
  getProfile() { return Promise.resolve(store.profile); }
  listCampaigns() { return this.campaigns.list(); }
  listExperiments() { return this.experiments.list(); }
  listContentItems() { return this.contentItems.list(); }
  listSeoPages() { return this.seoPages.list(); }
  listKeywordClusters() { return this.keywordClusters.list(); }
  listLifecycleFlows() { return this.lifecycleFlows.list(); }
  listPlanItems() { return this.planItems.list(); }
  listKpis(category: KpiCategory) {
    const list = store.kpis[category];
    return Promise.resolve(list ? list.slice() : null);
  }
  getIntakeResponses() { return Promise.resolve({ ...store.intakeResponses }); }

  // Writes --------------------------------------------------------------
  updateProfile(patch: Partial<BusinessProfile>) {
    store.profile = { ...store.profile, ...patch };
    return Promise.resolve(store.profile);
  }
  putIntakeResponses(patch: IntakeResponses) {
    store.intakeResponses = { ...store.intakeResponses, ...patch };
    return Promise.resolve({ ...store.intakeResponses });
  }

  createCampaign(i: Omit<Campaign, 'id'>) { return this.campaigns.create(i); }
  updateCampaign(id: string, p: Partial<Campaign>) { return this.campaigns.update(id, p); }
  deleteCampaign(id: string) { return this.campaigns.remove(id); }

  createExperiment(i: Omit<Experiment, 'id'>) { return this.experiments.create(i); }
  updateExperiment(id: string, p: Partial<Experiment>) { return this.experiments.update(id, p); }
  deleteExperiment(id: string) { return this.experiments.remove(id); }

  createContentItem(i: Omit<ContentItem, 'id'>) { return this.contentItems.create(i); }
  updateContentItem(id: string, p: Partial<ContentItem>) { return this.contentItems.update(id, p); }
  deleteContentItem(id: string) { return this.contentItems.remove(id); }

  createLifecycleFlow(i: Omit<LifecycleFlow, 'id'>) { return this.lifecycleFlows.create(i); }
  updateLifecycleFlow(id: string, p: Partial<LifecycleFlow>) { return this.lifecycleFlows.update(id, p); }
  deleteLifecycleFlow(id: string) { return this.lifecycleFlows.remove(id); }

  createPlanItem(i: Omit<PlanItem, 'id'>) { return this.planItems.create(i); }
  updatePlanItem(id: string, p: Partial<PlanItem>) { return this.planItems.update(id, p); }
  deletePlanItem(id: string) { return this.planItems.remove(id); }

  createSeoPage(i: Omit<SeoPage, 'id'>) { return this.seoPages.create(i); }
  updateSeoPage(id: string, p: Partial<SeoPage>) { return this.seoPages.update(id, p); }
  deleteSeoPage(id: string) { return this.seoPages.remove(id); }

  createKeywordCluster(i: Omit<KeywordCluster, 'id'>) { return this.keywordClusters.create(i); }
  updateKeywordCluster(id: string, p: Partial<KeywordCluster>) { return this.keywordClusters.update(id, p); }
  deleteKeywordCluster(id: string) { return this.keywordClusters.remove(id); }
}
