const {BeneficiaryModel, VendorModel, ProjectModel} = require('../models');

const Stats = {
  listBenGeo() {
    return BeneficiaryModel.find({}, 'extras.geo_latitude extras.geo_longitude');
  },
  benByWard() {
    return BeneficiaryModel.aggregate([
      {
        $group: {
          _id: '$extras.ward',
          count: {$sum: 1}
        }
      }
    ]);
  },
  benByGender() {
    return BeneficiaryModel.aggregate([
      {
        $group: {
          _id: '$gender',
          count: {$sum: 1}
        }
      }
    ]);
  },
  benByBanked() {
    return BeneficiaryModel.aggregate([
      {
        $group: {
          _id: '$extras.bank_has',
          count: {$sum: 1}
        }
      }
    ]);
  },
  benByPhone() {
    return BeneficiaryModel.aggregate([
      {
        $group: {
          _id: '$extras.phone_has',
          count: {$sum: 1}
        }
      }
    ]);
  },
  async summary() {
    let data = await BeneficiaryModel.aggregate([
      {
        $group: {
          _id: null,
          total_children: {
            $sum: {$convert: {input: '$extras.below5_count', to: 'int', onError: 0, onNull: 0}}
          },
          total_persons: {
            $sum: {$convert: {input: '$extras.family_size', to: 'int', onError: 0, onNull: 0}}
          },
          total_beneficiaries: {$sum: 1}
        }
      }
    ]);
    data = data[0];
    data.total_unbanked = await BeneficiaryModel.count({'extras.bank_has': false});
    data.total_vendors = await VendorModel.count({});
    delete data._id;
    return data;
  }
};

module.exports = {
  listBenGeo: req => Stats.listBenGeo(),
  benByWard: req => Stats.benByWard(),
  benByGender: req => Stats.benByGender(),
  benByBanked: req => Stats.benByBanked(),
  summary: req => Stats.summary(),
  benByPhone: req => Stats.benByPhone()
};
