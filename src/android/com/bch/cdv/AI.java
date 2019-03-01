package com.bch.cdv;

import android.content.res.AssetManager;
import android.util.Base64;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import com.bch.cdv.TE;

class AI {

    private static final String MDA = "SHA-256";

    private static final Map<String, String> aH = Collections.unmodifiableMap(
        new HashMap<String, String>()
    );

    public static void checkFile(ByteArrayInputStream stream) throws Exception {
        String h = gFH(stream);
        String oH = aH.get(h);
        if (oH == null || !oH.equals(h)) {
            throw new TE("Invalid file");
        }
    }


    private static String gFH(InputStream file) throws IOException, NoSuchAlgorithmException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        int nRead;
        byte[] data = new byte[16384];
        while ((nRead = file.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, nRead);
        }
        buffer.flush();
        MessageDigest digest = MessageDigest.getInstance(MDA);
        byte[] bytes = digest.digest(buffer.toByteArray());
        StringBuffer hs = new StringBuffer();
        for (int i = 0; i < bytes.length; i++) {
            if ((0xFF & bytes[i]) < 0x10) {
                hs.append("0");
            }
            hs.append(Integer.toHexString(0xFF & bytes[i]));
        }
        return new String(hs);
    }

}
