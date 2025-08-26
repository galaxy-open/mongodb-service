import RegionCodes from '#enums/region_codes'
import Region from '#models/region'

export default class RegionRepository {
  /**
   * Find region by code (business key)
   */
  async findByCode(code: RegionCodes): Promise<Region | null> {
    return Region.findBy('code', code)
  }

  /**
   * Find region by code or fail
   */
  async findByCodeOrFail(code: RegionCodes): Promise<Region> {
    const region = await Region.findBy('code', code)
    if (!region) {
      throw new Error(`Region with code ${code} not found`)
    }
    return region
  }

  /**
   * Get all regions
   */
  async findAll(): Promise<Region[]> {
    return Region.query().orderBy('name', 'asc')
  }

  /**
   * Get all active regions
   */
  async findAllActive(): Promise<Region[]> {
    return Region.query().where('is_active', true).orderBy('name', 'asc')
  }

  /**
   * Find region by code (primary key)
   */
  async findById(code: RegionCodes): Promise<Region | null> {
    return Region.find(code)
  }

  /**
   * Find region by code or fail
   */
  async findByIdOrFail(code: RegionCodes): Promise<Region> {
    return Region.findOrFail(code)
  }
}
