const path = require('path');
const TbcPaymentGateway = require('../src/gateways/tbc');

describe('Test gateway functionality', () => {
  let gateway;
  const certPath = path.join(__dirname, '..', 'certificates', 'test.cert');
  const certPass = 'supersecret';
  const clientIpAddr = '192.168.100.1';

  beforeEach(() => {
    gateway = new TbcPaymentGateway(certPath, certPass, clientIpAddr);
  });

  it('Checks if class instance is created', () => {
    expect(gateway).not.toBe(null);
  });

  it('Checks instance variables are set correctly', () => {
    expect(gateway.certPath).toEqual(certPath);
    expect(gateway.certPass).toEqual(certPass);
    expect(gateway.clientIpAddr).toEqual(clientIpAddr);
  });

  describe('Test wrapApi function', () => {
    beforeEach(() => {
      gateway = new TbcPaymentGateway(certPath, certPass, clientIpAddr);
    });
    it('Checks if api wrapper function is defined', () => {
      expect(gateway.wrapPostApi).toBeDefined();
      expect(gateway.parseAPiResult).toBeDefined();
    });
    it('Checks if wrapPostApi works as expected for bad instance variable', () => {
      gateway = new TbcPaymentGateway('randomBadPath', certPass, clientIpAddr);
      gateway.wrapPostApi().catch((err) => {
        expect(err).toBeTruthy();
      });
    });
    it('Checks if wrapPostApi works as expected for good instance variables', () => {
      gateway.wrapPostApi().then((res) => {
        expect(res).toBeTruthy();
      });
    });
  });
  describe('Test process function', () => {
    beforeEach(() => {
      gateway = new TbcPaymentGateway(certPath, certPass, clientIpAddr);
    });

    it('Checks if process function is defined', () => {
      expect(gateway.process).toBeDefined();
    });
    it('Checks if process fires necessary functions', () => {
      const wrapPostApi = jest.fn(gateway.wrapPostApi);
      gateway.wrapPostApi = wrapPostApi;
      const params = { key: 'value' };
      gateway.process(params);
      expect(wrapPostApi).toHaveBeenCalledWith(params);
    });
  });
  describe('Test that public functions are defined and fire proper functions', () => {
    beforeEach(() => {
      gateway = new TbcPaymentGateway(certPath, certPass, clientIpAddr);
      gateway.process = jest.fn();
    });

    it('Tests smsStartTransaction function', () => {
      const params = {
        amount: 100,
        biller: 'Sony',
        client_ip_addr: clientIpAddr,
        command: 'v',
        currency: 'GEL',
        description: 'Buy PS 5',
        language: 'ge',
        msg_type: 'SMS',
      };
      expect(gateway.smsStartTransaction).toBeDefined();
      gateway.smsStartTransaction(params);
      expect(gateway.process).toHaveBeenCalledWith(params);
    });

    it('Tests dmsStartAuthorization function', () => {
      const params = {
        amount: 100,
        biller: 'Sony',
        client_ip_addr: clientIpAddr,
        command: 'a',
        currency: 'GEL',
        description: 'Buy PS 5',
        language: 'ge',
        msg_type: 'DMS',
      };
      expect(gateway.dmsStartAuthorization).toBeDefined();
      gateway.dmsStartAuthorization(params);
      expect(gateway.process).toHaveBeenCalledWith(params);
    });

    it('Tests dmsMakeTransaction function', () => {
      const params = {
        amount: 100,
        client_ip_addr: clientIpAddr,
        command: 't',
        currency: 'GEL',
        description: 'Buy PS 5',
        language: 'ge',
        msg_type: 'DMS',
        trans_id: '1',
      };
      expect(gateway.dmsMakeTransaction).toBeDefined();
      gateway.dmsMakeTransaction(params);
      expect(gateway.process).toHaveBeenCalledWith(params);
    });

    it('Tests getTransactionResult function', () => {
      const params = {
        client_ip_addr: clientIpAddr,
        command: 'c',
        trans_id: '1',
      };
      expect(gateway.getTransactionResult).toBeDefined();
      gateway.getTransactionResult({ trans_id: '1' });
      expect(gateway.process).toHaveBeenCalledWith(params);
    });

    it('Tests reverseTransaction function', () => {
      const params = {
        command: 'r',
        trans_id: '1',
        amount: 100,
        suspected_fraud: 'YES',
      };
      expect(gateway.reverseTransaction).toBeDefined();
      gateway.reverseTransaction(params);
      expect(gateway.process).toHaveBeenCalledWith(params);
    });

    it('Tests refundTransaction function', () => {
      const params = {
        command: 'k',
        trans_id: '1',
        amount: 100,
      };
      expect(gateway.refundTransaction).toBeDefined();
      gateway.refundTransaction(params);
      expect(gateway.process).toHaveBeenCalledWith(params);
    });

    it('Tests creditTransaction function', () => {
      const params = {
        command: 'g',
        trans_id: '1',
        amount: 100,
      };
      expect(gateway.creditTransaction).toBeDefined();
      gateway.creditTransaction(params);
      expect(gateway.process).toHaveBeenCalledWith(params);
    });

    it('Tests closeDay function', () => {
      const params = {
        command: 'b',
      };
      expect(gateway.closeDay).toBeDefined();
      gateway.closeDay(params);
      expect(gateway.process).toHaveBeenCalledWith(params);
    });

    it('Tests smsStartTransactionWithSubscription function', () => {
      const params = {
        amount: 100,
        client_ip_addr: clientIpAddr,
        command: 'z',
        currency: 'GEL',
        description: 'Buy PS 5',
        language: 'ge',
        perspayee_expiry: '0122',
        perspayee_gen: 1,
        biller_client_id: '123',
        msg_type: 'SMS',
      };
      expect(gateway.smsStartTransactionWithSubscription).toBeDefined();
      gateway.smsStartTransactionWithSubscription(params);
      expect(gateway.process).toHaveBeenCalledWith(params);
    });

    it('Tests dmsStartAuthorizationWithSubscription function', () => {
      const params = {
        amount: 100,
        client_ip_addr: clientIpAddr,
        command: 'd',
        currency: 'GEL',
        description: 'Buy PS 5',
        language: 'ge',
        perspayee_expiry: '0122',
        perspayee_gen: 1,
        biller_client_id: '123',
        msg_type: 'DMS',
      };
      expect(gateway.dmsStartAuthorizationWithSubscription).toBeDefined();
      gateway.dmsStartAuthorizationWithSubscription(params);
      expect(gateway.process).toHaveBeenCalledWith(params);
    });

    it('Tests subscribeWithoutFirstPayment function', () => {
      const params = {
        client_ip_addr: clientIpAddr,
        command: 'p',
        currency: 'GEL',
        description: 'Buy PS 5',
        language: 'ge',
        perspayee_expiry: '0122',
        perspayee_gen: 1,
        biller_client_id: '123',
        msg_type: 'AUTH',
      };
      expect(gateway.subscribeWithoutFirstPayment).toBeDefined();
      gateway.subscribeWithoutFirstPayment(params);
      expect(gateway.process).toHaveBeenCalledWith(params);
    });

    it('Tests executeSubscriptionPayment function', () => {
      const params = {
        client_ip_addr: clientIpAddr,
        command: 'e',
        currency: 'GEL',
        description: 'Buy PS 5',
        biller_client_id: '123',
      };
      expect(gateway.executeSubscriptionPayment).toBeDefined();
      gateway.executeSubscriptionPayment(params);
      expect(gateway.process).toHaveBeenCalledWith(params);
    });
  });
});
