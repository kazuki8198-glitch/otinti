// CadetToon.shader — a first Unity-side answer to the HTML build's cel look:
// lambert diffuse quantized into three bands, flat colour, no specular.
// Used for the academy blocks and ground furniture in the Stage 3 world.
Shader "Cadet/Toon"
{
    Properties
    {
        _Color ("Color", Color) = (1,1,1,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        Pass
        {
            Tags { "LightMode"="ForwardBase" }
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            #include "UnityLightingCommon.cginc"
            struct v2f { float4 pos : SV_POSITION; float3 nrm : TEXCOORD0; };
            fixed4 _Color;
            v2f vert (appdata_base v)
            {
                v2f o; o.pos = UnityObjectToClipPos(v.vertex);
                o.nrm = UnityObjectToWorldNormal(v.normal);
                return o;
            }
            fixed4 frag (v2f i) : SV_Target
            {
                float ndl = dot(normalize(i.nrm), normalize(_WorldSpaceLightPos0.xyz)) * 0.5 + 0.5;
                float band = ndl < 0.35 ? 0.55 : (ndl < 0.72 ? 0.8 : 1.0);
                float3 rgb = _Color.rgb * band * (0.35 + 0.65 * _LightColor0.rgb);
                return fixed4(rgb, 1.0);
            }
            ENDCG
        }
    }
    Fallback "Diffuse"
}
