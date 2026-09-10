import { MedusaService } from "@medusajs/framework/utils"
import Vendor from "./models/vendor"
import VendorMember from "./models/vendor-member"
import VendorAdmin from "./models/vendor-admin"

class VendorModuleService extends MedusaService({
  Vendor,
  VendorMember,
  VendorAdmin,
}) {
  async getMembershipForUser(userId: string) {
    const admins = await this.listVendorAdmins({ user_id: userId })
    if (admins[0]) {
      const vendor = await this.retrieveVendor(admins[0].vendor_id)
      return { member: admins[0], vendor }
    }

    const members = await this.listVendorMembers({ user_id: userId })
    if (!members[0]) {
      return null
    }
    const vendor = await this.retrieveVendor(members[0].vendor_id)
    return { member: members[0], vendor }
  }

  async approveVendor(vendorId: string) {
    return await this.updateVendors({
      id: vendorId,
      status: "active",
      is_active: true,
    })
  }

  async suspendVendor(vendorId: string) {
    return await this.updateVendors({
      id: vendorId,
      status: "suspended",
      is_active: false,
    })
  }
}

export default VendorModuleService

