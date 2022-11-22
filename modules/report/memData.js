class MemData {
  constructor() {
    this.contractStatus = 'ready';
    this.resetOtp();
  }

  resetOtp() {
    this.otp = Math.floor(Math.random() * 9999999999) + 100000000;
  }

  updateContractStatus(status) {
    console.log(status);
    this.contractStatus = status;
  }
}

module.exports = new MemData();
