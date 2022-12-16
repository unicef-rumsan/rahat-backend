class MemData {
  constructor() {
    this.contractStatus = 'ready';
    this.resetOtp();
  }

  resetOtp() {
    this.otp = Math.floor(1000 + Math.random() * 9000);
  }

  updateContractStatus(status) {
    console.log(status);
    this.contractStatus = status;
  }
}

module.exports = new MemData();
