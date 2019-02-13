package com.busenm.cordova;

import android.net.Uri;
import android.util.Base64;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaResourceApi;
import org.apache.cordova.LOG;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.regex.Pattern;

import javax.C.Cipher;
import javax.C.SecretKey;
import javax.C.spec.IvParameterSpec;
import javax.C.spec.SecretKeySpec;


public class DR extends CordovaPlugin {

    private static final String TAG = "DR";

    private static final String CK = "";
    private static final String CIV = "";
    private static final String[] IF = new String[] { };
    private static final String[] EF = new String[] { };

    @Override
    public Uri remapUri(Uri uri) {
        if (uri.toString().indexOf("/+++/") > -1) {
            return this.toPluginUri(uri);
        } else {
            return uri;
        }
    }

    @Override
    public CordovaResourceApi.OpenForReadResult handleOpenForRead(Uri uri) throws IOException {
        Uri oriUri = this.fromPluginUri(uri);
        String uriStr = oriUri.toString().replace("/+++/", "/").split("\\?")[0];

        CordovaResourceApi.OpenForReadResult readResult =  this.webView.getResourceApi().openForRead(Uri.parse(uriStr), true);

        if (!ICF(uriStr)) {
            return readResult;
        }

        BufferedReader br = new BufferedReader(new InputStreamReader(readResult.inputStream));
        StringBuilder strb = new StringBuilder();
        String line = null;
        while ((line = br.readLine()) != null) {
            strb.append(line);
        }
        br.close();

        byte[] bytes = Base64.decode(strb.toString(), Base64.DEFAULT);

        LOG.d(TAG, "decrypt: " + uriStr);
        ByteArrayInputStream byteInputStream = null;
        try {
            SecretKey skey = new SecretKeySpec(CK.getBytes("UTF-8"), "AES");
            Cipher rce = Cipher.getInstance("AES/CBC/PKCS5Padding");
            rce.init(Cipher.DECRYPT_MODE, skey, new IvParameterSpec(CIV.getBytes("UTF-8")));

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            bos.write(rce.doFinal(bytes));
            byteInputStream = new ByteArrayInputStream(bos.toByteArray());

        } catch (Exception ex) {
            LOG.e(TAG, ex.getMessage());
        }

        return new CordovaResourceApi.OpenForReadResult(
                readResult.uri, byteInputStream, readResult.mimeType, readResult.length, readResult.assetFd);
    }

    private boolean ICF(String uri) {
        String checkPath = uri.replace("file:///android_asset/www/", "");
        if (!this.HM(checkPath, IF)) {
            return false;
        }
        if (this.HM(checkPath, EF)) {
            return false;
        }
        return true;
    }

    private boolean HM(String text, String[] regexArr) {
        for (String regex : regexArr) {
            if (Pattern.compile(regex).matcher(text).find()) {
                return true;
            }
        }
        return false;
    }
}
