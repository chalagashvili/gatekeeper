/**
*
* Tbcpay - online payments node JS SDK
*
*
* There are two types of transaction within this system: SMS and DMS.
* SMS - is direct payment, where money is charged in 1 event.
* DMS - is delayed. Requires two events: first event blocks money on the card
* second event takes this money.
* Second event can be carried out when product is shipped to the customer for example.
*
* Every 24 hours, the merchant must send a request to server to close the business day.
*
* Detailed instructions can be found in README.md or online
* https://github.com/chalagashvili/gatekeeper
*
* Written and maintained by chalagashvili5@gmail.com
*
*/

const fs = require('fs');
const axios = require('axios');
const util = require('util');
const { Agent } = require('https');

// Convert fs.readFile into Promise version of same
// use promisify approach to support older node js versions
const readFile = util.promisify(fs.readFile);

class TbcPaymentGateway {
  /** Variables used inside public functions and their descriptions below */


  constructor(certPath, certPass, clientIpAddr) {
    /**
     * absolute path to certificate
     * @var string
     */
    this.certPath = certPath;
    /**
     * certificate passphrase
     * @var string
     */
    this.certPass = certPass;
    /**
     * gateway endpoint
     * @var string
     */
    this.submitUrl = 'https://securepay.ufc.ge:18443/ecomm2/MerchantHandler';
    /**
     * client IP address, mandatory (15 characters)
     * @var string
     */
    this.clientIpAddr = clientIpAddr;
    // bind api post wrapper function to this
    this.wrapPostApi = this.wrapPostApi.bind(this);
  }

  wrapPostApi(params) {
    return new Promise((resolve, reject) => {
      readFile(this.certPath)
        .then((certFile) => {
          axios.post({
            url: this.submitUrl,
            params,
            httpsAgent: new Agent({
              ca: certFile, // because of Self-Signed certificate at payment server.
              cert: certFile,
              key: certFile,
              passphrase: this.certPass,
              requestCert: true, // maybe remove ?
              rejectUnauthorized: true, // maybe false?
            }),
          })
            .then((res) => resolve(res))
            .catch((err) => reject(err));
        })
        .catch((err) => reject(err));
    });
  }

  // eslint-disable-next-line class-methods-use-this
  parseApiResult(result) {
    const parsedResult = result;
    return parsedResult;
  }

  process(params) {
    return new Promise((resolve, reject) => {
      const { parseApiResult, wrapPostApi } = this;
      wrapPostApi(params)
        .then((res) => resolve(parseApiResult(res)))
        .catch((err) => reject(err));
    });
  }

  /**
   * Registering transactions
   * start SMS transaction. This is simplest form that charges amount to customer instantly.
   * @return array  TRANSACTION_ID
   * TRANSACTION_ID - transaction identifier (28 characters in base64 encoding)
   * error          - in case of an error
   */
  smsStartTransaction(config = {}) {
    const {
      /**
     * transaction amount in fractional units, mandatory (up to 12 digits)
     * 100 = 1 unit of currency. e.g. 1 gel = 100.
     * @var numeric
     * amount
     */
      amount,
      /**
     * transaction currency code (ISO 4217), mandatory, (3 digits)
     * http://en.wikipedia.org/wiki/ISO_4217
     * GEL = 981 e.g.
     * @var numeric
     * currency
     */
      currency,
      /**
     * transaction details, optional (up to 125 characters)
     * @var string
     * description
     */
      description,
      /**
     * authorization language identifier, optional (up to 32 characters)
     * EN, GE e.g,
     * @var string
     * language
     */
      language,
      /**
     * visible on account statement, optional (up to 99 latin characters)
     * @var string
     * biller
     */
      biller,
    } = config;
    const params = {
      command: 'v', // identifies a request for transaction registration
      amount,
      currency,
      client_ip_addr: this.clientIpAddr,
      description,
      language,
      biller,
      msg_type: 'SMS',
    };
    return this.process(params);
  }

  /**
   * Registering DMS authorization
   * DMS is different from SMS, dms_start_authorization blocks amount,
   * and than we use dms_make_transaction to charge customer.
   * @return array  TRANSACTION_ID
   * TRANSACTION_ID - transaction identifier (28 characters in base64 encoding)
   * error          - in case of an error
   */
  dmsStartAuthorization(config = {}) {
    const {
      amount, currency, description, language, biller,
    } = config;
    const params = {
      command: 'a', // identifies a request for transaction registration
      amount,
      currency,
      client_ip_addr: this.clientIpAddr,
      description,
      language,
      biller,
      msg_type: 'DMS',
    };
    return this.process(params);
  }

  /**
   * Executing a DMS transaction
   * @param  string transId
   * @return array  RESULT, RESULT_CODE, BRN, APPROVAL_CODE, CARD_NUMBER, error
   * RESULT         - transaction results: OK - successful transaction,
   * FAILED - failed transaction
   * RESULT_CODE    - transaction result code returned
   * from Card Suite Processing RTPS (3 digits)
   * BRN            - retrieval reference number returned from Card Suite
   * Processing RTPS (12 characters)
   * APPROVAL_CODE  - approval code returned from Card Suite Processing RTPS (max 6 characters)
   * CARD_NUMBER    - masked card number
   * error          - in case of an error
   */
  dmsMakeTransaction(config = {}) {
    const {
      trans_id: transId, amount, currency, description, language,
    } = config;
    const params = {
      command: 't', // identifies a request for transaction registration
      trans_id: transId,
      amount,
      currency,
      client_ip_addr: this.clientIpAddr,
      description,
      language,
      msg_type: 'DMS',
    };
    return this.process(params);
  }

  /**
   * Transaction result
   * @param  string transId
   * @return array  RESULT, RESULT_PS, RESULT_CODE, 3DSECURE, RRN, APPROVAL_CODE,
   * CARD_NUMBER, AAV, RECC_PMNT_ID, RECC_PMNT_EXPIRY, MRCH_TRANSACTION_ID
   * RESULT              - OK              - successfully completed transaction,
   *                       FAILED          - transaction has failed,
   *                       CREATED         - transaction just registered in the system,
   *                       PENDING         - transaction is not accomplished yet,
   *                       DECLINED        - transaction declined by ECOMM,
   *                       REVERSED        - transaction is reversed,
   *                       AUTOREVERSED    - transaction is reversed by autoreversal,
   *                       TIMEOUT         - transaction was timed out
   * RESULT_PS           - transaction result, Payment Server interpretation
   * (shown only if configured to return ECOMM2 specific details
   *                       FINISHED        - successfully completed payment,
   *                       CANCELLED       - cancelled payment,
   *                       RETURNED        - returned payment,
   *                       ACTIVE          - registered and not yet completed payment.
   * RESULT_CODE         - transaction result code returned from
   * Card Suite Processing RTPS (3 digits)
   * 3DSECURE            - AUTHENTICATED   - successful 3D Secure authorization
   *                       DECLINED        - failed 3D Secure authorization
   *                       NOTPARTICIPATED - cardholder is not a member of 3D Secure scheme
   *                       NO_RANGE        - card is not in 3D secure card range defined by issuer
   *                       ATTEMPTED       - cardholder 3D secure
   * authorization using attempts ACS server
   *                       UNAVAILABLE     - cardholder 3D secure authorization is unavailable
   *                       ERROR           - error message received from ACS server
   *                       SYSERROR        - 3D secure authorization ended with system error
   *                       UNKNOWNSCHEME   - 3D secure authorization was
   * attempted by wrong card scheme (Dinners club, American Express)
   * RRN                 - retrieval reference number returned from Card Suite Processing RTPS
   * APPROVAL_CODE       - approval code returned from Card Suite
   * Processing RTPS (max 6 characters)
   * CARD_NUMBER         - Masked card number
   * AAV                 - FAILED the results of the verification of hash
   * value in AAV merchant name (only if failed)
   * RECC_PMNT_ID            - Reoccurring payment (if available)
   * identification in Payment Server.
   * RECC_PMNT_EXPIRY        - Reoccurring payment (if available) expiry
   * date in Payment Server in form of YYMM
   * MRCH_TRANSACTION_ID     - Merchant Transaction Identifier (if available)
   * for Payment - shown if it was sent as additional parameter  on Payment registration.
   * The RESULT_CODE and 3DSECURE fields are informative only and can be not shown.
   * The fields RRN and APPROVAL_CODE appear for successful transactions only,
   * for informative purposes,
   * and they facilitate tracking the transactions in Card Suite Processing RTPS system.
   * error                   - In case of an error
   * warning                 - In case of warning (reserved for future use).
   */
  getTransactionResult(config = {}) {
    const { trans_id: transId } = config;
    const params = {
      command: 'c', // identifies a request for transaction registration
      trans_id: transId,
      client_ip_addr: this.clientIpAddr,
    };
    return this.process(params);
  }

  /**
   * Transaction reversal
   * @param  object->string transId
   * @param  object->string amount          reversal amount in fractional
   * units (up to 12 characters). For DMS authorizations only full amount can be reversed,
   * i.e., the reversal and authorization amounts have to match.
   * In other cases partial reversal is also available.
   * @param  object->string suspectedFraud flag, indicating that transaction
   * is being reversed because of suspected fraud. In such cases this parameter value
   * should be set to yes. If this parameter is used, then only full reversals are allowed.
   * @return array  RESULT, RESULT_CODE
   * RESULT         - OK              - successful reversal transaction
   *                  REVERSED        - transaction has already been reversed
   *                  FAILED          - failed to reverse transaction
   * (transaction status remains as it was)
   * RESULT_CODE    - reversal result code returned from Card Suite Processing RTPS (3 digits)
   * error          - In case of an error
   * warning        - In case of warning (reserved for future use).
   */
  reverseTransaction(config = {}) {
    const { trans_id: transId, amount = '', suspected_fraud: suspectedFraud = '' } = config;
    const params = {
      command: 'r', // identifies a request for transaction registration
      trans_id: transId,
      amount,
      suspected_fraud: suspectedFraud,
    };
    return this.process(params);
  }

  /**
   * Transaction refund
   * @param  object config { string amount   refund amount
   * in fractional units (up to 12 characters)
   * string  transId original transaction identifier, mandatory (28 characters) }
   * @return array  RESULT, RESULT_CODE, REFUND_TRANS_ID
   * RESULT          - OK     - successful refund transaction
   *                   FAILED - failed refund transaction
   * RESULT_CODE     - result code returned from Card Suite Processing RTPS (3 digits)
   * REFUND_TRANS_ID - refund transaction identifier - applicable for
   * obtaining refund payment details or to request refund payment reversal.
   * error           - In case of an error
   * warning         - In case of warning (reserved for future use).
   */
  refundTransaction(config = {}) {
    const { trans_id: transId, amount = '' } = config;
    const params = {
      command: 'k', // identifies a request for transaction registration
      trans_id: transId,
      amount,
    };
    return this.process(params);
  }

  /**
   * Credit transaction
   * @param  object config { string  amount   credit transaction amount in
   * fractional units (up to 12 characters)
   * transId original transaction identifier, mandatory (28 characters) }
   * @return array   RESULT, RESULT_CODE, REFUND_TRANS_ID
   * RESULT          - OK     - successful credit transaction
   *           FAILED - failed credit transaction
   * RESULT_CODE     - result code returned from Card Suite Processing RTPS (3 digits)
   * REFUND_TRANS_ID - credit transaction identifier - applicable for obtaining
   * credit payment details or to request credit payment reversal.
   * error           - In case of an error
   * warning         - In case of warning (reserved for future use).
   */
  creditTransaction(config = {}) {
    const { trans_id: transId, amount } = config;
    const params = {
      command: 'g', // identifies a request for transaction registration
      trans_id: transId,
      amount,
    };
    return this.process(params);
  }

  /**
   * needs to be run once every 24 hours.
   * this tells bank to process all transactions of that day SMS or DMS that were success
   * in case of DMS only confirmed and sucessful transactions will be processed
   * @return array RESULT, RESULT_CODE, FLD_075, FLD_076, FLD_087, FLD_088
   * RESULT        - OK     - successful end of business day
   *                 FAILED - failed end of business day
   * RESULT_CODE   - end-of-business-day code returned from Card Suite Processing RTPS (3 digits)
   * FLD_075       - the number of credit reversals
   * (up to 10 digits), shown only if result_code begins with 5
   * FLD_076       - the number of debit transactions
   * (up to 10 digits), shown only if result_code begins with 5
   * FLD_087       - total amount of credit reversals
   * (up to 16 digits), shown only if result_code begins with 5
   * FLD_088       - total amount of debit transactions
   * (up to 16 digits), shown only if result_code begins with 5
   */
  closeDay() {
    const params = {
      command: 'b', // identifies a request for transaction registration
    };
    return this.process(params);
  }

  /* This section below is for Regular Payments / Subscription */


  /* Subscribe with paying first
    *  perspayee_expiry=0822  format is DDMM
    *  biller_client_id is generated by merchant (shop owner)
    */
  smsStartTransactionWithSubscription(config = {}) {
    const {
      amount, currency, description,
      language, biller_client_id: billerClientId,
      perspayee_expiry: expiration,
    } = config;
    const params = {
      command: 'z',
      amount,
      currency,
      client_ip_addr: this.clientIpAddr,
      language,
      description,
      biller_client_id: billerClientId,
      perspayee_expiry: expiration,
      perspayee_gen: 1,
      msg_type: 'SMS',
    };
    return this.process(params);
  }

  dmsStartAuthorizationWithSubscription(config = {}) {
    const {
      amount, currency, description, language,
      biller_client_id: billerClientId,
      perspayee_expiry: expiration,
    } = config;
    const params = {
      command: 'd',
      amount,
      currency,
      client_ip_addr: this.clientIpAddr,
      language,
      description,
      biller_client_id: billerClientId,
      perspayee_expiry: expiration,
      perspayee_gen: 1,
      msg_type: 'DMS',
    };
    return this.process(params);
  }

  subscribeWithoutFirstPayment(config = {}) {
    const {
      currency, description, language,
      biller_client_id: billerClientId,
      perspayee_expiry: expiration,
    } = config;
    const params = {
      command: 'p',
      currency,
      client_ip_addr: this.clientIpAddr,
      language,
      description,
      biller_client_id: billerClientId,
      perspayee_expiry: expiration,
      perspayee_gen: 1,
      msg_type: 'AUTH',
    };
    return this.process(params);
  }

  /* Every subscription cycle merchant (shop owner) should manually
  execute taking money from the customer with saved biller_client_id  */
  executeSubscriptionPayment(config = {}) {
    const {
      currency, description, amount,
      biller_client_id: billerClientId,
    } = config;
    const params = {
      command: 'e',
      amount,
      currency,
      client_ip_addr: this.clientIpAddr,
      description,
      biller_client_id: billerClientId,
    };
    return this.process(params);
  }
}

module.exports = TbcPaymentGateway;
