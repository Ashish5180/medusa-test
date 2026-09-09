import { MedusaService } from "@medusajs/framework/utils"
import Vendor from "./models/vendor"
import VendorMember from "./models/vendor-member"

class VendorModuleService extends MedusaService({
  Vendor,
  VendorMember,
}) {
  async getMembershipForUser(userId: string) {
    const members = await this.listVendorMembers({ user_id: userId })
    if (!members[0]) {
      return null
    }
    const vendor = await this.retrieveVendor(members[0].vendor_id)
    return { member: members[0], vendor }
  }
}

export default VendorModuleService
