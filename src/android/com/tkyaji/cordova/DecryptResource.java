package com.tkyaji.cordova;

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

import com.tkyaji.cordova.AssetsIntegrity;
import com.tkyaji.cordova.TamperingException;


public class DecryptResource extends CordovaPlugin {

    private static final String TOAST_MSG = "";
    private static final String CRYPT_KEY = "";
    private static final String CRYPT_IV = "";
    private static final String[] INCLUDE_FILES = new String[] { };
    private static final String[] EXCLUDE_FILES = new String[] { };

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

        if (!isCryptFiles(uriStr)) {
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

        ByteArrayInputStream byteInputStream = null;
        ByteArrayInputStream streamToValidate = null;
        try {
            SecretKey skey = new SecretKeySpec(CRYPT_KEY.getBytes("UTF-8"), "AES");
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, skey, new IvParameterSpec(CRYPT_IV.getBytes("UTF-8")));

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            bos.write(cipher.doFinal(bytes));
            byteInputStream = new ByteArrayInputStream(bos.toByteArray());
            streamToValidate = new ByteArrayInputStream(bos.toByteArray());

            byte[] msgBytes = Base64.decode(TOAST_MSG, Base64.DEFAULT);
            final ByteArrayOutputStream baos = new ByteArrayOutputStream();
            baos.write(cipher.doFinal(msgBytes));

            try {
                AssetsIntegrity.checkFile(streamToValidate);
            } catch (final TamperingException e) {
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
                readResult.uri, byteInputStream, readResult.mimeType, readResult.length, readResult.assetFd);
    }

    private boolean isCryptFiles(String uri) {
        String checkPath = uri.replace("file:///android_asset/www/", "");
        if (!this.hasMatch(checkPath, INCLUDE_FILES)) {
            return false;
        }
        if (this.hasMatch(checkPath, EXCLUDE_FILES)) {
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
