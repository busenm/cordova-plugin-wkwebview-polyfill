package com.tkyj.cdv;

import android.net.Uri;
import android.util.Base64;
import android.widget.Toast;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaResourceApi;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.regex.Pattern;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import com.tkyj.cdv.AI;
import com.tkyj.cdv.TE;


public class DR extends CordovaPlugin {

    private static final String TM = "";
    private static final String CK = "";
    private static final String CIV = "";
    private static final String[] F_IN = new String[] { };
    private static final String[] F_EX = new String[] { };

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

        if (!isIncluded(uriStr)) {
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

        ByteArrayInputStream bis = null;
        ByteArrayInputStream stv = null;
        try {
            SecretKey sk = new SecretKeySpec(CK.getBytes("UTF-8"), "AES");
            Cipher cph = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cph.init(Cipher.DECRYPT_MODE, sk, new IvParameterSpec(CIV.getBytes("UTF-8")));

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            bos.write(cph.doFinal(bytes));
            bis = new ByteArrayInputStream(bos.toByteArray());
            stv = new ByteArrayInputStream(bos.toByteArray());

            byte[] msgBytes = Base64.decode(TM, Base64.DEFAULT);
            final ByteArrayOutputStream baos = new ByteArrayOutputStream();
            baos.write(cph.doFinal(msgBytes));

            try {
                AI.checkFile(stv);
            } catch (final TE e) {
                cordova.getActivity().runOnUiThread(new Runnable() {
                    public void run () {
                        Toast.makeText(cordova.getActivity().getApplicationContext(), new String(baos.toByteArray()), Toast.LENGTH_LONG).show();
                        cordova.getActivity().finishAndRemoveTask();
                    }
                });
            }

        } catch (Exception ex) {
           ex.printStackTrace();
        }

        return new CordovaResourceApi.OpenForReadResult(
                readResult.uri, bis, readResult.mimeType, readResult.length, readResult.assetFd);
    }

    private boolean isIncluded(String uri) {
        String checkPath = uri.replace("file:///android_asset/www/", "");
        if (!this.hasMatch(checkPath, F_IN)) {
            return false;
        }
        if (this.hasMatch(checkPath, F_EX)) {
            return false;
        }
        return true;
    }

    private boolean hasMatch(String text, String[] regexArr) {
        for (String regex : regexArr) {
            if (Pattern.compile(regex).matcher(text).find()) {
                return true;
            }
        }
        return false;
    }
}
