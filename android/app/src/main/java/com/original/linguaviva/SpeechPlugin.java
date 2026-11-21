package com.original.linguaviva;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.speech.RecognizerIntent;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;

/** Reconhecimento de voz usando o motor do Android (mais confiável que o WebView). */
@CapacitorPlugin(
    name = "Speech",
    permissions = @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
)
public class SpeechPlugin extends Plugin {

    @PluginMethod()
    public void recognize(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "onPermission");
            return;
        }
        launchRecognizer(call);
    }

    @PermissionCallback()
    private void onPermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            launchRecognizer(call);
        } else {
            call.reject("Permissão de microfone negada");
        }
    }

    private void launchRecognizer(PluginCall call) {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("lang", "en-US"));
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Fale agora…");
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        startActivityForResult(call, intent, "onSpeechResult");
    }

    @ActivityCallback()
    private void onSpeechResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            ArrayList<String> matches = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (matches != null && !matches.isEmpty()) {
                JSObject res = new JSObject();
                res.put("text", matches.get(0));
                call.resolve(res);
                return;
            }
        }
        call.reject("Reconhecimento cancelado");
    }
}
