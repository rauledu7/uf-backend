import SyncCategoriesService from 'App/Services/Synchronizations/SyncCategoriesService'
import SyncBrandsService from 'App/Services/Synchronizations/SyncBrandsService'
import SyncProductService from 'App/Services/Synchronizations/SyncProductService'
import SyncMenuService from 'App/Services/Synchronizations/SyncMenuService'
import SyncOptionsService from 'App/Services/Synchronizations/SyncOptionsService'
import SyncProductsPacksService from 'App/Services/Synchronizations/SyncProductsPacksService'
import SyncFiltersService from 'App/Services/Synchronizations/SyncFiltersService'
import SyncPacksReserveService from 'App/Services/Synchronizations/SyncPacksReserveService'
import AlertWarningService from 'App/Services/AlertWarningService'

export default class SynchronizatioController {
  constructor(
    private readonly syncCategoriesService: SyncCategoriesService = new SyncCategoriesService(),
    private readonly syncBrandsService: SyncBrandsService = new SyncBrandsService(),
    private readonly syncProductsService: SyncProductService = new SyncProductService(),
    private readonly syncMenuService: SyncMenuService = new SyncMenuService(),
    private readonly syncOptionsService: SyncOptionsService = new SyncOptionsService(),
    private readonly syncPacksService: SyncProductsPacksService = new SyncProductsPacksService(),
    private readonly syncFiltersService: SyncFiltersService = new SyncFiltersService(),
    private readonly syncPacksReserveService: SyncPacksReserveService = new SyncPacksReserveService()
  ) {}

  public async syncCategories() {
    try {
      const initSynchronization = await this.syncCategoriesService.syncCategoriesFromBigcommerce()
      return initSynchronization
    } catch (error) {
      return { status: 400, error: error.code, message: error.message, stack: error.stack }
    }
  }
  public async syncBrands() {
    try {
      const initSynchronization = await this.syncBrandsService.syncBrandsFromBigcommerce()
      return initSynchronization
    } catch (error) {
      return { status: 400, error: error.code, message: error.message, stack: error.stack }
    }
  }
  public async syncProducts() {
    try {
      const initSynchronization = await this.syncProductsService.syncProductsFromBigcommerce()
      return initSynchronization
    } catch (error) {
      console.error('Error en la sincronización de productos:', error)
      return { status: 400, error: error.code, message: error.message, stack: error.stack }
    }
  }
  public async syncMenu() {
    try {
      const initSynchronization = await this.syncMenuService.syncMenuFromBigcommerce()
      return initSynchronization
    } catch (error) {
      return { status: 400, error: error.code, message: error.message, stack: error.stack }
    }
  }
  public async syncAllOptions() {
    try {
      const initSynchronization = await this.syncOptionsService.syncOptionsFromBigcommerce()
      return initSynchronization
    } catch (error) {
      return { status: 400, error: error.code, message: error.message, stack: error.stack }
    }
  }
  public async syncProductsTypePacks() {
    try {
      const initSynchronization = await this.syncPacksService.syncPacksFromBigcommerce()
      return initSynchronization
    } catch (error) {
      return { status: 400, error: error.code, message: error.message, stack: error.stack }
    }
  }
  public async syncFiltersOfProducts() {
    try {
      const initSynchronization = await this.syncFiltersService.syncFiltersFromBigcommerce()
      return initSynchronization
    } catch (error) {
      return { status: 400, error: error.code, message: error.message, stack: error.stack }
    }
  }

  public async syncPacksTypeReserve() {
    try {
      const initSynchronization = await this.syncPacksReserveService.syncPacksReserve()
      return initSynchronization
    } catch (error) {
      return {
        status: 400,
        error: error.code,
        message: error.message,
        stack: error.stack,
        detail: error.detail || undefined
      }
    }
  }
  public async syncAlertStock() {
    try {
      const alerts = await AlertWarningService.checkStockSecurityAlert()
      return alerts
    } catch (error) {
      return {
        status: 400,
        error: error.code,
        message: error.message,
        stack: error.stack,
        detail: error.detail || undefined
      }
    }
  }
  public async syncAll() {
    try {
      await this.syncBrandsService.syncBrandsFromBigcommerce()
      await this.syncCategoriesService.syncCategoriesFromBigcommerce()
      await this.syncProductsService.syncProductsFromBigcommerce()
      await this.syncPacksService.syncPacksFromBigcommerce()
      return 'Sincronización Exitosa'
    } catch (error) {
      return {
        status: 400,
        error: error.code,
        message: error.message,
        stack: error.stack,
        detail: error.detail || undefined
      }
    }
  }
}
