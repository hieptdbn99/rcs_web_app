import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Bỏ qua lỗi chứng chỉ SSL tự cấp của Hikrobot RCS
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function generateSignature(
  appKey: string,
  appSecret: string,
  host: string,
  path: string,
  nonce: string,
  timestamp: string,
  body: string
) {
  const requestId = uuidv4().replace(/-/g, '').substring(0, 16);
  const authHeader = `nonce="${nonce}",method="HMAC-SHA256",timestamp="${timestamp}"`;
  const version = "v1.0";

  const originalString = `POST ${path} HTTP/1.1\n` +
    `AUTHORIZATION: ${authHeader}\n` +
    `HOST: ${host}\n` +
    `X-LR-APPKEY: ${appKey}\n` +
    `X-LR-REQUEST-ID: ${requestId}\n` +
    `X-LR-SOURCE: wms\n` +
    `X-LR-VERSION: ${version}\n\n` +
    `${body}`;

  // 1. HMAC-SHA256
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(originalString, 'utf8');
  const hmacHex = hmac.digest('hex');

  // 2. MD5 and extract middle 16 characters
  const md5 = crypto.createHash('md5');
  md5.update(hmacHex, 'utf8');
  const md5Hex = md5.digest('hex');
  const signature = md5Hex.substring(8, 24);

  return { signature, requestId, authHeader, version };
}

export async function POST(request: Request) {
  try {
    const rcsHost = process.env.RCS_HOST;
    const appKey = process.env.APP_KEY || '';
    const appSecret = process.env.APP_SECRET || '';

    if (!rcsHost) {
      return NextResponse.json({ error: 'Missing RCS_HOST environment variable' }, { status: 500 });
    }

    const { carrierCode, siteCode, carrierDir } = await request.json();
    
    // Construct the payload based on RCS-2000 API doc for Carrier Bind
    const payload = {
      carrierCode: carrierCode,
      siteCode: siteCode,
      carrierDir: parseInt(carrierDir) || 0,
    };
    
    const bodyString = JSON.stringify(payload);
    
    // Parse host
    const hostUrl = new URL(rcsHost);
    const hostHeader = hostUrl.host;
    const path = '/api/robot/controller/carrier/bind';
    
    // Prepare Headers
    const headers: Record<string, string> = {
      'Host': hostHeader,
      'Content-Type': 'application/json;charset=UTF-8',
      'X-lr-request-id': uuidv4().replace(/-/g, '').substring(0, 16),
      'X-lr-source': 'wms',
      'X-lr-version': 'v1.0'
    };

    let rcsUrl = `${rcsHost.replace(/\/+$/, '')}/rcs/rtas${path}`;

    // NẾU CÓ APP_KEY VÀ APP_SECRET THÌ MỚI BẬT CHẾ ĐỘ MÃ HÓA BẢO MẬT
    if (appKey && appSecret) {
      const date = new Date();
      const timestamp = date.toISOString().replace(/\.\d{3}Z$/, '+00:00');
      const nonce = Math.random().toString(36).substring(2, 9);
      
      const { signature, requestId, authHeader, version } = generateSignature(
        appKey,
        appSecret,
        hostHeader,
        path,
        nonce,
        timestamp,
        bodyString
      );

      // Add signature to URL
      rcsUrl = `${rcsUrl}?sign=${signature}`;
      
      // Add secure headers
      headers['Authorization'] = authHeader;
      headers['X-lr-appkey'] = appKey;
      headers['X-lr-request-id'] = requestId; // Use the one used in signature
      headers['X-lr-source'] = 'wms';
      headers['X-lr-version'] = version;
    }

    console.log(`[RCS] Sending bind request to: ${rcsUrl}`);

    const response = await fetch(rcsUrl, {
      method: 'POST',
      headers: headers,
      body: bodyString,
    });

    const responseData = await response.json();
    
    return NextResponse.json({
      success: true,
      rcsResponse: responseData
    });

  } catch (error: any) {
    console.error('RCS API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
